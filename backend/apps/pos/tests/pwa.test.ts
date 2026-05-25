import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA build artefacts', () => {
  it('vite build produces dist/manifest.webmanifest and a service worker file', async () => {
    execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });

    const dist = resolve(process.cwd(), 'dist');
    expect(existsSync(`${dist}/manifest.webmanifest`)).toBe(true);

    // vite-plugin-pwa emits the SW as either dist/sw.js OR dist/service-worker.js depending on version.
    const swCandidate1 = `${dist}/sw.js`;
    const swCandidate2 = `${dist}/service-worker.js`;
    expect(existsSync(swCandidate1) || existsSync(swCandidate2)).toBe(true);

    const mf = JSON.parse(await readFile(`${dist}/manifest.webmanifest`, 'utf-8'));
    expect(mf.name).toBe('Hanoot PoS');
    expect(mf.display).toBe('standalone');
  }, 120000);
});
