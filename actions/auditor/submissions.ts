'use server';

import { GithubClientError } from '@/lib/auditor/github/client';
import {
  GENERIC_SUBMISSION_ERROR,
  inspectSubmission,
  SubmissionServiceError,
  submitSkills,
  type SubmitSkillsInput,
} from '@/lib/auditor/submission/service';
import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/report-error';

type ActionResponse<T> = {
  response: 'success' | 'error';
  message: string;
  data: T | null;
};

export async function inspectSubmissionAction(url: string): Promise<ActionResponse<
  Awaited<ReturnType<typeof inspectSubmission>>
>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { response: 'error', message: 'Inicia sesión para continuar', data: null };
    }

    const rateLimit = await checkRateLimit([
      { key: `auditor:submission:inspect:${session.user.id}`, window: 600, max: 30 },
    ]);
    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Has realizado demasiadas consultas. Inténtalo en ${rateLimit.retryAfter} segundos`,
        data: null,
      };
    }

    return {
      response: 'success',
      message: 'Repositorio revisado',
      data: await inspectSubmission(session.user.id, url),
    };
  } catch (error) {
    return actionError(error, 'auditor.submissions.inspect');
  }
}

export async function submitSkillsAction(
  input: SubmitSkillsInput,
): Promise<ActionResponse<{ redirectTo: string }>> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { response: 'error', message: 'Inicia sesión para continuar', data: null };
    }

    const rateLimit = await checkRateLimit([
      { key: `auditor:submission:submit:${session.user.id}`, window: 600, max: 10 },
    ]);
    if (rateLimit.limited) {
      return {
        response: 'error',
        message: `Has realizado demasiados envíos. Inténtalo en ${rateLimit.retryAfter} segundos`,
        data: null,
      };
    }

    return {
      response: 'success',
      message: 'Envío preparado',
      data: await submitSkills(session.user.id, input),
    };
  } catch (error) {
    return actionError(error, 'auditor.submissions.submit');
  }
}

function actionError<T>(error: unknown, area: string): ActionResponse<T> {
  if (error instanceof GithubClientError || error instanceof SubmissionServiceError) {
    return { response: 'error', message: error.message, data: null };
  }
  reportError(error, { area });
  return { response: 'error', message: GENERIC_SUBMISSION_ERROR, data: null };
}
