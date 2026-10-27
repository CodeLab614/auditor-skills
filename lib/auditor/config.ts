let warnedAboutMissingGithubToken = false;

export function getGithubToken(): string | undefined {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token && !warnedAboutMissingGithubToken) {
    console.warn('GITHUB_TOKEN is not set; GitHub API requests use the unauthenticated rate limit.');
    warnedAboutMissingGithubToken = true;
  }
  return token || undefined;
}
