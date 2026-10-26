export const PASSWORD_AUTH_DISABLED_MESSAGE =
  'Email and password sign-in is disabled. Sign in with GitHub.';

export function passwordAuthDisabled() {
  return {
    response: 'error' as const,
    message: PASSWORD_AUTH_DISABLED_MESSAGE,
    data: null,
  };
}
