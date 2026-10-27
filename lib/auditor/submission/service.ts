import { Prisma } from '@prisma/client';
import { createGithubClient } from '@/lib/auditor/github/client';
import { getGithubToken } from '@/lib/auditor/config';
import { SUBMISSION_LIMITS, currentCreditMonth } from '@/lib/auditor/limits';
import { prisma } from '@/lib/prisma';
import { detectSkills, type TreeEntry } from './detect-skills';
import { filesFingerprint as createFilesFingerprint } from './fingerprint';
import { parseGithubUrl } from './parse-github-url';
import { parseSkillManifest } from './skill-manifest';
import {
  generateSkillSlug,
  getManifestPathsToRead,
  getSkillLimitReason,
  needsSourceFiles,
  validateSelectedSkillPaths,
  type SubmissionSkill,
} from './submission-rules';

const GENERIC_SUBMISSION_ERROR = 'No se pudo enviar la skill; inténtalo de nuevo';
const BLOCKED_REPOSITORY_MESSAGE = 'Esta skill fue retirada del catálogo';
const CHANGED_BRANCH_MESSAGE = 'La rama cambió desde que la revisaste; vuelve a revisarla';

export class SubmissionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubmissionServiceError';
  }
}

export type SubmissionInspection = {
  owner: string;
  repo: string;
  commitSha: string;
  ref: string;
  skills: SubmissionSkill[];
  remaining: number;
  maxPerSubmission: number;
};

export type SubmitSkillsInput = {
  url: string;
  commitSha: string;
  paths: string[];
};

export async function inspectSubmission(
  userId: string,
  url: string,
): Promise<SubmissionInspection> {
  const prepared = await inspectRepository(url);
  const now = new Date();
  const creditMonth = currentCreditMonth(now);
  const [used] = await Promise.all([
    prisma.analysisJob.count({
      where: { userId, creditMonth, creditReturnedAt: null },
    }),
  ]);

  return {
    owner: prepared.owner,
    repo: prepared.repo,
    commitSha: prepared.commitSha,
    ref: prepared.ref,
    skills: prepared.skills.map((skill) => ({
      path: skill.path,
      name: skill.name,
      description: skill.description,
      state: skill.state,
      ...(skill.target ? { target: skill.target } : {}),
      ...(skill.reason ? { reason: skill.reason } : {}),
    })),
    remaining: Math.max(0, SUBMISSION_LIMITS.monthlyAnalyses - used),
    maxPerSubmission: SUBMISSION_LIMITS.maxPerSubmission,
  };
}

export async function submitSkills(
  userId: string,
  input: SubmitSkillsInput,
): Promise<{ redirectTo: string }> {
  if (!input || typeof input.url !== 'string' || typeof input.commitSha !== 'string') {
    throw new SubmissionServiceError('La solicitud de envío no es válida');
  }

  const prepared = await inspectRepository(input.url);
  if (input.commitSha !== prepared.commitSha) {
    throw new SubmissionServiceError(CHANGED_BRANCH_MESSAGE);
  }

  const selection = validateSelectedSkillPaths(input.paths, prepared.skills);
  if (!selection.ok) throw new SubmissionServiceError(selection.message);
  if (selection.skills.length > SUBMISSION_LIMITS.maxPerSubmission) {
    throw new SubmissionServiceError(
      `No puedes enviar más de ${SUBMISSION_LIMITS.maxPerSubmission} skills a la vez`,
    );
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
        // Different users can submit the same skill at once: lock each skill too, in a fixed order.
        const skillKeys = selection.skills
          .map((skill) => `skill:${prepared.owner}/${prepared.repo}/${skill.path}`)
          .sort();
        for (const key of skillKeys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        }

        const creditMonth = currentCreditMonth();
        const used = await tx.analysisJob.count({
          where: { userId, creditMonth, creditReturnedAt: null },
        });
        const remaining = Math.max(0, SUBMISSION_LIMITS.monthlyAnalyses - used);
        const plans = [] as PlannedSkill[];

        for (const requested of selection.skills) {
          const skill = await tx.skill.findUnique({
            where: {
              owner_repo_path: {
                owner: prepared.owner,
                repo: prepared.repo,
                path: requested.path,
              },
            },
            include: {
              versions: {
                where: { filesFingerprint: requested.filesFingerprint },
                include: {
                  analysisJobs: {
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, kind: true, status: true },
                  },
                },
              },
            },
          });

          if (skill?.hiddenAt) throw new SubmissionServiceError(BLOCKED_REPOSITORY_MESSAGE);

          if (
            skill
            && (skill.displayOwner !== prepared.displayOwner || skill.displayRepo !== prepared.displayRepo)
          ) {
            await tx.skill.update({
              where: { id: skill.id },
              data: {
                displayOwner: prepared.displayOwner,
                displayRepo: prepared.displayRepo,
              },
            });
            skill.displayOwner = prepared.displayOwner;
            skill.displayRepo = prepared.displayRepo;
          }
          const version = skill?.versions?.[0];
          const activeJob = version?.analysisJobs.find((job) =>
            job.status === 'queued' || job.status === 'running');
          const latestJob = version?.analysisJobs[0];
          const completedWithoutRemoteScripts = Boolean(
            version && !version.hasRemoteScripts && latestJob?.status === 'done',
          );

          if (activeJob) {
            plans.push({
              requested,
              skill,
              version: version ?? null,
              jobId: activeJob.id,
              spendsCredit: false,
            });
          } else if (completedWithoutRemoteScripts && version) {
            plans.push({ requested, skill, version, jobId: null, spendsCredit: false });
          } else if (version) {
            plans.push({
              requested,
              skill,
              version,
              jobId: null,
              jobKind: latestJob?.status === 'failed'
                ? latestJob.kind
                : version.hasRemoteScripts ? 'fingerprint_check' : 'analysis',
              spendsCredit: true,
            });
          } else {
            plans.push({
              requested,
              skill,
              version: null,
              jobId: null,
              jobKind: 'analysis',
              spendsCredit: true,
            });
          }
        }

        const creditsToSpend = plans.filter((plan) => plan.spendsCredit).length;
        const allowedCredits = Math.min(remaining, SUBMISSION_LIMITS.maxPerSubmission);
        if (creditsToSpend > allowedCredits) {
          throw new SubmissionServiceError(remaining === 0
            ? 'Ya no te quedan análisis este mes'
            : `Puedes enviar hasta ${allowedCredits} análisis con el límite que te queda`);
        }

        const targets: string[] = [];
        for (const plan of plans) {
          if (plan.jobId) {
            targets.push(`/analysis/${plan.jobId}`);
            continue;
          }
          if (plan.version && !plan.spendsCredit) {
            targets.push(`/skills/${plan.skill!.slug}`);
            continue;
          }

          let skill = plan.skill;
          if (!skill) {
            const slug = await findAvailableSlug(tx, prepared.owner, prepared.repo, plan.requested.path);
            skill = await tx.skill.create({
              data: {
                owner: prepared.owner,
                repo: prepared.repo,
                displayOwner: prepared.displayOwner,
                displayRepo: prepared.displayRepo,
                path: plan.requested.path,
                name: plan.requested.name,
                description: plan.requested.description,
                slug,
              },
            });
          }

          const version = plan.version ?? await tx.skillVersion.create({
            data: {
              skillId: skill.id,
              filesFingerprint: plan.requested.filesFingerprint,
              sourceFiles: plan.requested.sourceFiles,
              commitSha: prepared.commitSha,
              submittedRef: prepared.ref,
              submittedById: userId,
            },
          });
          if (plan.version && needsSourceFiles(plan.version.sourceFiles)) {
            await tx.skillVersion.update({
              where: { id: version.id },
              data: { sourceFiles: plan.requested.sourceFiles },
            });
          }
          const job = await tx.analysisJob.create({
            data: {
              versionId: version.id,
              kind: plan.jobKind!,
              status: 'queued',
              userId,
              creditMonth,
            },
            select: { id: true },
          });
          targets.push(`/analysis/${job.id}`);
        }

        return {
          redirectTo: targets.length === 1 ? targets[0]! : '/dashboard/submissions',
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < 3) continue;
      throw error;
    }
  }

  throw new SubmissionServiceError(GENERIC_SUBMISSION_ERROR);
}

type PreparedSkill = SubmissionSkill & {
  filesFingerprint: string;
  sourceFiles: TreeEntry[];
};

type SubmissionVersion = {
  id: string;
  filesFingerprint: string;
  hasRemoteScripts: boolean;
  sourceFiles?: unknown;
  analysisJobs: { id: string; kind: 'analysis' | 'fingerprint_check'; status: string }[];
};

type ExistingSubmissionSkill = {
  id: string;
  path: string;
  slug: string;
  hiddenAt: Date | null;
  displayOwner?: string | null;
  displayRepo?: string | null;
  versions?: SubmissionVersion[];
};

type PlannedSkill = {
  requested: PreparedSkill;
  skill: ExistingSubmissionSkill | null;
  version: SubmissionVersion | null;
  jobId: string | null;
  jobKind?: 'analysis' | 'fingerprint_check';
  spendsCredit: boolean;
};

async function inspectRepository(url: string): Promise<{
  owner: string;
  repo: string;
  displayOwner: string;
  displayRepo: string;
  commitSha: string;
  ref: string;
  skills: PreparedSkill[];
}> {
  const parsed = parseGithubUrl(url);
  if (!parsed.ok) throw new SubmissionServiceError(parsed.reason);
  const owner = parsed.owner.toLowerCase();
  const repo = parsed.repo.toLowerCase();

  const blocked = await prisma.blockedRepository.findUnique({
    where: { owner_repo: { owner, repo } },
    select: { id: true },
  });
  if (blocked) throw new SubmissionServiceError(BLOCKED_REPOSITORY_MESSAGE);

  const github = createGithubClient(getGithubToken());
  const resolved = await github.resolveRefAndPath(owner, repo, parsed.refAndPath ?? []);
  const { displayOwner, displayRepo } = splitFullName(resolved.fullName);
  const tree = await github.getTree(owner, repo, resolved.commitSha);
  const manifestPaths = getManifestPathsToRead(tree, resolved.path);
  if (!Array.isArray(manifestPaths)) throw new SubmissionServiceError(manifestPaths.error);

  const manifests = new Map(await Promise.all(manifestPaths.map(async (path) => {
    const entry = tree.find((candidate) => candidate.path === path);
    if (!entry) return [path, null] as const;
    const text = await github.getBlobText(owner, repo, entry.sha);
    return [path, parseSkillManifest(text)] as const;
  })));
  const detected = detectSkills(tree, manifests, resolved.path);
  if ('error' in detected) throw new SubmissionServiceError(detected.error);

  const existingSkills: ExistingSubmissionSkill[] = await prisma.skill.findMany({
    where: { owner, repo, path: { in: detected.skills.map((skill) => skill.path) } },
    select: {
      id: true,
      path: true,
      slug: true,
      hiddenAt: true,
      versions: {
        select: {
          id: true,
          filesFingerprint: true,
          hasRemoteScripts: true,
          analysisJobs: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, kind: true, status: true },
          },
        },
      },
    },
  });
  const existingByPath = new Map(existingSkills.map((skill) => [skill.path, skill]));

  const skills = detected.skills.map((skill): PreparedSkill => {
    const fingerprint = createFilesFingerprint(skill.files);
    const existing = existingByPath.get(skill.path);
    const matchingVersion = existing?.versions?.find((version) =>
      version.filesFingerprint === fingerprint);
    const activeJob = matchingVersion?.analysisJobs.find((job) =>
      job.status === 'queued' || job.status === 'running');
    const hasDoneJob = matchingVersion?.analysisJobs[0]?.status === 'done';
    const limitReason = getSkillLimitReason(skill, SUBMISSION_LIMITS);
    let state: SubmissionSkill['state'] = 'new';
    let target: string | undefined;

    if (existing?.hiddenAt) {
      state = 'retired';
    } else if (limitReason) {
      state = 'rejected';
    } else if (activeJob) {
      state = 'in-progress';
      target = `/analysis/${activeJob.id}`;
    } else if (matchingVersion && !matchingVersion.hasRemoteScripts && hasDoneJob) {
      state = 'analyzed';
      target = `/skills/${existing!.slug}`;
    }

    return {
      path: skill.path,
      name: skill.name,
      description: skill.description,
      state,
      ...(target ? { target } : {}),
      ...(state === 'rejected' ? { reason: limitReason } : {}),
      filesFingerprint: fingerprint,
      sourceFiles: skill.files.map((file) => ({
        path: file.path,
        type: file.type,
        sha: file.sha,
        mode: file.mode,
        ...(file.size !== undefined ? { size: file.size } : {}),
      })),
    };
  });

  return {
    owner,
    repo,
    displayOwner,
    displayRepo,
    commitSha: resolved.commitSha,
    ref: resolved.ref,
    skills,
  };
}

function splitFullName(fullName: string): { displayOwner: string; displayRepo: string } {
  const slashIndex = fullName.indexOf('/');
  if (slashIndex < 0) {
    return { displayOwner: fullName, displayRepo: '' };
  }
  return {
    displayOwner: fullName.slice(0, slashIndex),
    displayRepo: fullName.slice(slashIndex + 1),
  };
}

async function findAvailableSlug(
  tx: Prisma.TransactionClient,
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const usedSlugs = new Set<string>();
  while (true) {
    const slug = generateSkillSlug(owner, repo, path, usedSlugs);
    const existing = await tx.skill.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    usedSlugs.add(slug);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export { GENERIC_SUBMISSION_ERROR };
