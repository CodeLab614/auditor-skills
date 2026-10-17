import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

// Server actions handle everything else; new plugin routes stay closed by default.
const ALLOWED_PATHS = [/^\/callback\/[^/]+$/, /^\/error$/, /^\/ok$/];

function isAllowedPath(request: Request) {
  const pathname = new URL(request.url).pathname;
  const authPath = pathname.slice("/api/auth".length);

  return ALLOWED_PATHS.some((pattern) => pattern.test(authPath));
}

export async function GET(request: Request) {
  if (!isAllowedPath(request)) {
    return new Response("Not Found", { status: 404 });
  }

  return handlers.GET(request);
}

export async function POST(request: Request) {
  if (!isAllowedPath(request)) {
    return new Response("Not Found", { status: 404 });
  }

  return handlers.POST(request);
}
