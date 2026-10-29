import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

console.log("Memole's World — verifica strumenti desktop\n");
console.log(`Sistema: ${process.platform} ${process.arch} · Node ${process.version}`);
let missing = false;
for (const [name, args] of [['rustc', ['--version']], ['cargo', ['--version']]]) {
  const result = spawnSync(name, args, { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) { console.log(`MANCANTE: ${name}`); missing = true; }
  else console.log(result.stdout.trim());
}
if (process.platform === 'win32') {
  const vswhere = `${process.env['ProgramFiles(x86)']}\\Microsoft Visual Studio\\Installer\\vswhere.exe`;
  const found = existsSync(vswhere) ? spawnSync(vswhere, ['-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath'], { encoding: 'utf8', windowsHide: true }) : null;
  if (!found?.stdout?.trim()) { console.log('MANCANTE: Visual Studio C++ Build Tools (Desktop development with C++ e Windows SDK)'); missing = true; }
  else console.log(`C++: ${found.stdout.trim()}`);
  console.log('WebView2: controllare anche con npm run tauri info.');
} else if (process.platform === 'darwin') {
  const xcode = spawnSync('xcode-select', ['-p'], { encoding: 'utf8' });
  if (xcode.status !== 0) { console.log('MANCANTE: Xcode Command Line Tools'); missing = true; }
  else console.log(`Xcode: ${xcode.stdout.trim()}`);
}
console.log(missing ? '\nBuild desktop non pronta. Segui AVVIO-WINDOWS.md oppure docs/BUILD-MACOS.md.' : '\nStrumenti principali rilevati. Esegui npm run tauri info e poi il test desktop.');
console.log('Il controllo non compila l’app e non conferma una build riuscita.');
process.exitCode = missing ? 1 : 0;
