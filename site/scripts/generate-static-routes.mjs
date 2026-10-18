import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = path.join(siteRoot, 'dist');
const versionRoot = path.join(siteRoot, 'src/content/versions');
const entryHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8');
const versionDirectories = await readdir(versionRoot, { withFileTypes: true });
const routes = ['quick-start', 'rule', 'download'];

// GitHub Pages serves physical files. Give every existing URL its own entry
// instead of depending on a web server's SPA rewrite/fallback configuration.
for (const directory of versionDirectories.filter((entry) => entry.isDirectory())) {
  const metadataPath = path.join(versionRoot, directory.name, 'version.json');
  const { id } = JSON.parse(await readFile(metadataPath, 'utf8'));
  if (id !== directory.name || !/^v\d+\.\d+\.\d+$/.test(id)) {
    throw new Error(`Invalid version id in ${metadataPath}`);
  }
  // The editable JSON lives with the version content. Publish a generated copy
  // at the existing download URL without keeping two editable copies in Git.
  const yaku = await readFile(path.join(versionRoot, id, 'yaku.json'), 'utf8');
  const assetDestination = path.join(distRoot, 'assets', id);
  await mkdir(assetDestination, { recursive: true });
  await writeFile(path.join(assetDestination, 'yaku.json'), yaku);
  routes.push(id, ...['rule', 'tile', 'yaku', 'search'].map((page) => `${id}/${page}`));
}

for (const route of routes) {
  const destination = path.join(distRoot, route);
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, 'index.html'), entryHtml);
}
await writeFile(path.join(distRoot, '404.html'), entryHtml);
await writeFile(path.join(distRoot, '.nojekyll'), '');
console.log(`Created ${routes.length + 1} static page entries and a 404 page.`);
