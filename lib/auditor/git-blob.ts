export async function gitBlobSha(bytes: Uint8Array): Promise<string> {
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const full = new Uint8Array(header.byteLength + bytes.byteLength);
  full.set(header, 0);
  full.set(bytes, header.byteLength);
  const hashBuffer = await crypto.subtle.digest("SHA-1", full);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
