import { getEnv } from '@/lib/env';

type SocialProviderEnvironment = {
  [key: string]: string | undefined;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

function resolvedSocialEnvironment(): SocialProviderEnvironment {
  const { github } = getEnv().config;
  return {
    GITHUB_CLIENT_ID: github.clientId,
    GITHUB_CLIENT_SECRET: github.clientSecret,
  };
}

export function createSocialProviders(
  env: SocialProviderEnvironment = resolvedSocialEnvironment(),
) {
  return {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            disableImplicitSignUp: true,
            mapProfileToUser: (profile: { avatar_url: string }) => ({
              image: profile.avatar_url,
            }),
          },
        }
      : {}),
  };
}
