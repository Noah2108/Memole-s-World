import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';

const read = (path: string) => readFileSync(new URL(path, import.meta.url));
describe('configurazione e asset desktop', () => {
  it('rispetta lo schema ufficiale incluso nella CLI Tauri installata', () => {
    const schema = JSON.parse(read('../node_modules/@tauri-apps/cli/config.schema.json').toString());
    const config = JSON.parse(read('../src-tauri/tauri.conf.json').toString());
    const validate = new Ajv({ strict: false, allErrors: true, validateFormats: false, unicodeRegExp: false }).compile(schema);
    expect(validate(config), JSON.stringify(validate.errors)).toBe(true);
    const mac = JSON.parse(read('../src-tauri/tauri.macos.conf.json').toString());
    const merged = {
      ...config,
      app: { ...config.app, ...mac.app },
      bundle: { ...config.bundle, ...mac.bundle, macOS: { ...config.bundle.macOS, ...mac.bundle.macOS } },
    };
    expect(validate(merged), JSON.stringify(validate.errors)).toBe(true);
  });
  it('contiene icone binarie Windows e macOS effettivamente generate', () => {
    expect(read('../src-tauri/icons/icon.icns').subarray(0, 4).toString()).toBe('icns');
    expect([...read('../src-tauri/icons/icon.ico').subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    expect([...read('../src-tauri/icons/128x128.png').subarray(0, 4)]).toEqual([137, 80, 78, 71]);
  });
});
