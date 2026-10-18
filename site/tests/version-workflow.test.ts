import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'aws-mahjong-version-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  for (const script of ['add-version.mjs', 'generate-static-routes.mjs']) {
    await cp(path.join(siteRoot, 'scripts', script), path.join(root, 'scripts', script));
  }
  await cp(path.join(siteRoot, 'src/content/versions/v2.0.1'), path.join(root, 'src/content/versions/v2.0.1'), { recursive: true });
  await cp(path.join(siteRoot, 'public/assets/v2.0.1'), path.join(root, 'public/assets/v2.0.1'), { recursive: true });
  return root;
}

function run(root: string, script: string, ...args: string[]) {
  return execFileSync(process.execPath, [path.join(root, 'scripts', script), ...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
}

describe('version authoring and static publication', () => {
  it('creates an independent version without changing its source, then publishes all new URLs', async () => {
    const root = await fixture();
    const originalJson = await readFile(path.join(root, 'src/content/versions/v2.0.1/yaku.json'), 'utf8');
    run(root, 'add-version.mjs', 'v99.0.0', '--from', 'v2.0.1');

    const metadata = JSON.parse(await readFile(path.join(root, 'src/content/versions/v99.0.0/version.json'), 'utf8'));
    expect(metadata.id).toBe('v99.0.0');
    expect(metadata.title).toContain('v99.0.0');
    expect(await readFile(path.join(root, 'src/content/versions/v99.0.0/yaku.json'), 'utf8')).toBe(originalJson);
    expect(await readFile(path.join(root, 'src/content/versions/v2.0.1/yaku.json'), 'utf8')).toBe(originalJson);
    expect(await readFile(path.join(root, 'public/assets/v99.0.0/output/1m.svg'))).toEqual(await readFile(path.join(root, 'public/assets/v2.0.1/output/1m.svg')));

    // A static host has no SPA fallback: every version and child page needs a file.
    await mkdir(path.join(root, 'dist'), { recursive: true });
    const html = '<!doctype html><div id="root"></div>';
    await writeFile(path.join(root, 'dist/index.html'), html);
    run(root, 'generate-static-routes.mjs');
    for (const route of ['quick-start', 'rule', 'download', 'v99.0.0', 'v99.0.0/rule', 'v99.0.0/tile', 'v99.0.0/yaku', 'v99.0.0/search']) {
      expect(await readFile(path.join(root, 'dist', route, 'index.html'), 'utf8')).toBe(html);
    }
    expect(await readFile(path.join(root, 'dist/assets/v99.0.0/yaku.json'), 'utf8')).toBe(originalJson);
    expect(await readFile(path.join(root, 'dist/404.html'), 'utf8')).toBe(html);
  });

  it('rejects existing, invalid, and missing-source versions without adding directories', async () => {
    const root = await fixture();
    for (const args of [
      ['v2.0.1', '--from', 'v2.0.1'],
      ['../escape', '--from', 'v2.0.1'],
      ['v99.0.0', '--from', 'v88.0.0'],
    ]) {
      expect(() => run(root, 'add-version.mjs', ...args)).toThrow();
    }
    expect(await readdir(path.join(root, 'src/content/versions'))).toEqual(['v2.0.1']);
    expect(await readdir(path.join(root, 'public/assets'))).toEqual(['v2.0.1']);
  });

  it('rejects incomplete tile assets before creating any version directories', async () => {
    const root = await fixture();
    await rm(path.join(root, 'public/assets/v2.0.1/output/9s.svg'));
    expect(() => run(root, 'add-version.mjs', 'v99.0.0', '--from', 'v2.0.1')).toThrow();
    expect(await readdir(path.join(root, 'src/content/versions'))).toEqual(['v2.0.1']);
    expect(await readdir(path.join(root, 'public/assets'))).toEqual(['v2.0.1']);
  });
});
