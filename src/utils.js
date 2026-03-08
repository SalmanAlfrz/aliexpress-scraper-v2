import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export function randomDelay(min = 2000, max = 5000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry(fn, maxRetries = 3, label = '') {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const prefix = label ? `[${label}] ` : '';
      console.error(`${prefix}Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        const backoff = attempt * 2000;
        console.log(`${prefix}Retrying in ${backoff}ms...`);
        await randomDelay(backoff, backoff + 2000);
      }
    }
  }
  throw lastError;
}

export async function saveToJSON(data, filename, outputDir = 'output', prettyPrint = false) {
  await mkdir(outputDir, { recursive: true });

  const filePath = join(outputDir, filename);
  const content = prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeFile(filePath, content, 'utf-8');

  console.log(`Saved: ${filePath}`);
  return filePath;
}

export function sanitizeFilename(url) {
  return url
    .replace(/https?:\/\//, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 100);
}

export function timestamp() {
  return new Date().toISOString();
}
