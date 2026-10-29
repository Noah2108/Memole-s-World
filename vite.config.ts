import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/target/**', '**/deliverables/**'] } },
  envPrefix: ['VITE_'],
  build: { target: ['es2021', 'safari16'] },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
