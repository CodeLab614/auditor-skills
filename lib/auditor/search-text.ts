export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

export function skillSearchText(input: {
  name: string;
  description: string;
  owner: string;
  repo: string;
}): string {
  return normalizeSearchText(
    `${input.name} ${input.description} ${input.owner}/${input.repo}`
  );
}
