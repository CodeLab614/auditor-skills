import { isIP } from "node:net";

export const TRUSTED_PROXY_VALUES = [
  "none",
  "vercel",
  "cloudflare",
  "proxy",
] as const;

export type TrustedProxy = (typeof TRUSTED_PROXY_VALUES)[number];

type HeadersReader = Pick<Headers, "get">;

const HEADER_BY_PROXY: Record<Exclude<TrustedProxy, "none">, string> = {
  vercel: "x-vercel-forwarded-for",
  cloudflare: "cf-connecting-ip",
  proxy: "x-real-ip",
};

export function resolveTrustedProxy(value: string | undefined): TrustedProxy {
  return TRUSTED_PROXY_VALUES.includes(value as TrustedProxy)
    ? (value as TrustedProxy)
    : "none";
}

export const trustedProxy = resolveTrustedProxy(process.env.TRUSTED_PROXY);

let proxyWarningLogged = false;

export function warnAboutTrustedProxyConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (proxyWarningLogged) return;

  const configuredValue = env.TRUSTED_PROXY;
  if (
    configuredValue &&
    !TRUSTED_PROXY_VALUES.includes(configuredValue as TrustedProxy)
  ) {
    proxyWarningLogged = true;
    console.warn(
      `Unknown TRUSTED_PROXY value "${configuredValue}"; treating it as "none". See docs/en/07-scheduled-cleanup.md.`,
    );
    return;
  }

  if (env.NODE_ENV === "production" && resolveTrustedProxy(configuredValue) === "none") {
    proxyWarningLogged = true;
    console.warn(
      "TRUSTED_PROXY is none; IP-based rate limits and session IP tracking are disabled. See docs/en/07-scheduled-cleanup.md.",
    );
  }
}

export function getClientIpFromHeaders(
  headers: HeadersReader,
  proxy: TrustedProxy = trustedProxy,
): string | null {
  if (proxy === "none") return null;

  const value = headers.get(HEADER_BY_PROXY[proxy])?.trim();
  return value && isIP(value) !== 0 ? value : null;
}

export function getBetterAuthIpAddressOptions(
  proxy: TrustedProxy = trustedProxy,
): { disableIpTracking: boolean; ipAddressHeaders?: string[] } {
  if (proxy === "none") return { disableIpTracking: true };

  return {
    disableIpTracking: false,
    ipAddressHeaders: [HEADER_BY_PROXY[proxy]],
  };
}
