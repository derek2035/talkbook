import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = resolve(repoRoot, 'apps/miniprogram/src/manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (!manifest.appid || typeof manifest.appid !== 'string') {
  throw new Error(`Missing appid in ${manifestPath}`);
}

function collectProjectConfigPaths(dirPath, matches = []) {
  if (!existsSync(dirPath)) {
    return matches;
  }

  for (const entry of readdirSync(dirPath)) {
    const entryPath = resolve(dirPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      collectProjectConfigPaths(entryPath, matches);
      continue;
    }

    if (entry === 'project.config.json' && entryPath.includes('/dist/build/mp-weixin/')) {
      matches.push(entryPath);
    }
  }

  return matches;
}

const projectConfigPaths = [
  ...collectProjectConfigPaths(resolve(repoRoot, 'apps/miniprogram')),
  ...collectProjectConfigPaths(resolve(repoRoot, '.local'))
];

if (!projectConfigPaths.length) {
  throw new Error('No mp-weixin project.config.json files found to sync');
}

for (const projectConfigPath of projectConfigPaths) {
  const projectConfig = JSON.parse(readFileSync(projectConfigPath, 'utf8'));
  projectConfig.appid = manifest.appid;
  writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`, 'utf8');
}

console.log(`Synced mp-weixin AppID to ${manifest.appid} in ${projectConfigPaths.length} file(s)`);
