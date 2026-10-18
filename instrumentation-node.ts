import { getStorageConfigError } from './lib/storage/config';

export function validateStorageConfig() {
  const error = getStorageConfigError(process.env);
  if (error) {
    console.error(`File storage configuration error: ${error}`);
    process.exit(1);
  }
}
