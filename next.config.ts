import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { getTurnstileConfigError } from "./lib/turnstile-config";

const nextConfig = (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const error = getTurnstileConfigError(process.env);
    if (error) throw new Error(error);
  }

  return {
    reactCompiler: true,
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
