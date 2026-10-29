import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = resolve(root, 'node_modules/@tauri-apps/cli/tauri.js');
const result = spawnSync(process.execPath, [bin, 'icon', 'assets/app-icon.svg'], { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync(resolve(root, 'public'), { recursive: true });
copyFileSync(resolve(root, 'assets/app-icon.svg'), resolve(root, 'public/app-icon.svg'));
// Il generatore Tauri emette anche asset mobili. Il prodotto è solo desktop.
const iconRoot = resolve(root, 'src-tauri/icons');
for (const dir of ['ios', 'android']) {
  const target = resolve(iconRoot, dir);
  if (!target.startsWith(iconRoot + sep)) throw new Error('Percorso icone fuori dal progetto');
  rmSync(target, { recursive: true, force: true });
}
