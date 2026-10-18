import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { getTurnstileConfigError } from "./lib/turnstile-config";
import { siteConfig } from "./config/site";

const nextConfig = (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const exampleValues = [
      siteConfig.legalEntityName.startsWith("REPLACE_WITH_") && "legalEntityName",
      siteConfig.contactEmail.startsWith("REPLACE_WITH_") && "contactEmail",
      siteConfig.governingLaw.startsWith("REPLACE_WITH_") && "governingLaw",
    ].filter(Boolean);
    if (exampleValues.length > 0) {
      console.warn(
        `\n⚠️  LEGAL CONFIGURATION: ${exampleValues.join(", ")} still use example values in config/site.ts. Replace them before deploying ${siteConfig.appName}.\n`,
      );
    }

    if ((process.env.STORAGE_DRIVER || 'local').trim().toLowerCase() === 'local') {
      console.warn(
        '\n⚠️  FILE STORAGE: STORAGE_DRIVER=local stores uploaded files on this server. Configure persistent disk or mount a volume at /app/storage in production. See docs/en/05-file-storage.md.\n',
      );
    }
  }

  if (
    phase === PHASE_PRODUCTION_BUILD &&
    process.env.RAPIDAUTH_SKIP_TURNSTILE_BUILD_CHECK !== "1"
  ) {
    const error = getTurnstileConfigError(process.env);
    if (error) throw new Error(error);
  }

  return {
    experimental: {
      serverActions: { bodySizeLimit: '4.25mb' },
    },
    distDir: process.env.RAPIDAUTH_NEXT_DIST_DIR ?? ".next",
    reactCompiler: true,
    output: "standalone",
    outputFileTracingIncludes: {
      "/*": ["./node_modules/.prisma/client/**/*"],
    },
    ...(process.env.DOCKER_DEV_POLLING === "true"
      ? { watchOptions: { pollIntervalMs: 1000 } }
      : {}),
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "images.unsplash.com" },
        { protocol: "https", hostname: "lh3.googleusercontent.com" },
        { protocol: "https", hostname: "avatars.githubusercontent.com" },
      ],
    },
  };
};

export default nextConfig;
