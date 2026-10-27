import type { JobState } from "@/lib/auditor/types";

export type DatabaseJobState = "queued" | "running" | "done" | "failed";
export type DatabaseJobKind = "analysis" | "fingerprint_check";

export function mapJobState(state: DatabaseJobState, kind: DatabaseJobKind): JobState {
  if (state === "queued" && kind === "fingerprint_check") return "checking";
  return state;
}
