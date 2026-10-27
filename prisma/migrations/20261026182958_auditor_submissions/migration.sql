-- CreateEnum
CREATE TYPE "AnalysisJobKind" AS ENUM ('analysis', 'fingerprint_check');

-- CreateEnum
CREATE TYPE "AnalysisJobStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_version" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "submittedRef" TEXT NOT NULL,
    "filesFingerprint" TEXT NOT NULL,
    "fingerprint" TEXT,
    "hasRemoteScripts" BOOLEAN NOT NULL DEFAULT false,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_job" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "kind" "AnalysisJobKind" NOT NULL,
    "status" "AnalysisJobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "userId" TEXT,
    "creditMonth" TEXT,
    "creditReturnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "analysis_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_repository" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "blocked_repository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_slug_key" ON "skill"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_owner_repo_path_key" ON "skill"("owner", "repo", "path");

-- CreateIndex
CREATE INDEX "skill_version_skillId_filesFingerprint_idx" ON "skill_version"("skillId", "filesFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "skill_version_skillId_fingerprint_key" ON "skill_version"("skillId", "fingerprint");

-- CreateIndex
CREATE INDEX "analysis_job_status_createdAt_idx" ON "analysis_job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "analysis_job_userId_creditMonth_idx" ON "analysis_job"("userId", "creditMonth");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_repository_owner_repo_key" ON "blocked_repository"("owner", "repo");

-- AddForeignKey
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_job" ADD CONSTRAINT "analysis_job_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "skill_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_job" ADD CONSTRAINT "analysis_job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_repository" ADD CONSTRAINT "blocked_repository_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
