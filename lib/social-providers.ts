type SocialProviderEnvironment = {
  [key: string]: string | undefined;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export function createSocialProviders(env: SocialProviderEnvironment) {
  return {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            disableImplicitSignUp: true,
            mapProfileToUser: (profile: { picture: string }) => ({
              image: profile.picture,
            }),
          },
        }
      : {}),
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
