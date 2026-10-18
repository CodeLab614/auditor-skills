export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateStorageConfig } = await import('./instrumentation-node');
  validateStorageConfig();
}
