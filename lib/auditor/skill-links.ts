export type AnalysisHrefOptions = {
  version?: number;
  section?: string;
  file?: string;
  line?: number;
};

export function skillHref(slug: string): string {
  return `/skills/${slug}`;
}

export function analysisHref(
  slug: string,
  options?: AnalysisHrefOptions
): string {
  const parts: string[] = [];
  if (options?.version !== undefined) {
    parts.push(`v=${encodeURIComponent(options.version)}`);
  }
  if (options?.section !== undefined) {
    parts.push(`section=${encodeURIComponent(options.section)}`);
  }
  if (options?.file !== undefined) {
    parts.push(`file=${encodeURIComponent(options.file)}`);
  }
  const query = parts.length > 0 ? `?${parts.join("&")}` : "";
  const hash = options?.line !== undefined ? `#L${options.line}` : "";
  return `/skills/${slug}/analysis${query}${hash}`;
}

export function legacyAnalysisRedirect(
  slug: string,
  search: Record<string, string | string[] | undefined>
): string | null {
  const rawV = Array.isArray(search.v) ? search.v[0] : search.v;
  const rawSection = Array.isArray(search.section)
    ? search.section[0]
    : search.section;
  const rawFile = Array.isArray(search.file) ? search.file[0] : search.file;

  if (rawV === undefined && rawSection === undefined && rawFile === undefined) {
    return null;
  }

  let version: number | undefined;
  if (rawV !== undefined) {
    const parsed = Number(rawV);
    if (Number.isInteger(parsed) && parsed > 0 && /^\s*\d+\s*$/.test(rawV)) {
      version = parsed;
    }
  }

  return analysisHref(slug, {
    version,
    section: rawSection,
    file: rawFile,
  });
}
