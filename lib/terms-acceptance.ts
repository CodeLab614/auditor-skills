import { siteConfig } from '@/config/site';

export const TERMS_ACCEPTANCE_HEADER = 'x-rapidauth-terms-accepted';

export type StoredTermsAcceptance = {
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
};

export type RegistrationTermsAcceptance = {
  source: 'email' | 'oauth' | null;
  accepted: unknown;
};

export function resolveTermsAcceptance(
  registration: RegistrationTermsAcceptance,
  acceptedAt = new Date(),
): Partial<StoredTermsAcceptance> {
  if (!registration.source || registration.accepted !== true) return {};

  return {
    termsAcceptedAt: acceptedAt,
    termsVersion: siteConfig.termsVersion,
  };
}

export function hasAcceptedCurrentTerms(
  acceptance: StoredTermsAcceptance,
): boolean {
  return Boolean(
    acceptance.termsAcceptedAt &&
      acceptance.termsVersion === siteConfig.termsVersion,
  );
}
