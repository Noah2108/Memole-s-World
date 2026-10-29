import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  console.error('La build .app/.dmg richiede macOS. Su Windows usa il workflow Mac ARM64 incluso in .github/workflows.');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const identity = process.env.APPLE_SIGNING_IDENTITY?.trim() || '-';
if (identity !== '-' && !['APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID'].every(key => process.env[key]?.trim())) {
  console.error('Per la build Developer ID servono anche APPLE_ID, APPLE_PASSWORD (specifica per app) e APPLE_TEAM_ID per notarizzare. Consulta docs/BUILD-MACOS.md.');
  process.exit(1);
}

console.log(`Memole’s World · ARM64 · macOS minimo 13.0 · firma ${identity === '-' ? 'ad hoc (collaudo)' : 'Developer ID con notarizzazione'}`);
const result = spawnSync(process.execPath, [
  resolve(root, 'node_modules/@tauri-apps/cli/tauri.js'),
  'build', '--target', 'aarch64-apple-darwin', '--bundles', 'app,dmg',
  '--config', JSON.stringify({ bundle: { macOS: { signingIdentity: identity } } }),
  '--', '--locked',
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, MACOSX_DEPLOYMENT_TARGET: '13.0' },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
