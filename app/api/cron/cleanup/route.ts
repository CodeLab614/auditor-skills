import { createHash, timingSafeEqual } from "node:crypto";
import { reportError } from "@/lib/report-error";
import { runScheduledCleanup } from "@/lib/scheduled-cleanup";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

function hasValidAuthorization(authorization: string | null, secret: string): boolean {
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const received = createHash("sha256").update(authorization ?? "").digest();
  return timingSafeEqual(received, expected);
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: "Not found" }, { status: 404, headers: responseHeaders });
  }

  if (!hasValidAuthorization(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
  }

  try {
    const counts = await runScheduledCleanup();
    console.info("Scheduled cleanup completed", counts);
    return Response.json(counts, { headers: responseHeaders });
  } catch (error) {
    reportError(error, { area: "scheduled-cleanup.route" });
    return Response.json(
      { error: "Cleanup failed" },
      { status: 500, headers: responseHeaders },
    );
  }
}
