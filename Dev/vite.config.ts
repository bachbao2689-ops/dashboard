import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function appVersionPlugin() {
  const buildVersion = String(Date.now());
  const buildTime = new Date().toISOString();

  return {
    name: 'app-version-plugin',
    config() {
      return {
        define: {
          __APP_VERSION__: JSON.stringify(buildVersion),
          __APP_BUILD_TIME__: JSON.stringify(buildTime),
        },
      };
    },
    buildStart() {
      const versionData = JSON.stringify(
        {
          version: buildVersion,
          builtAt: buildTime,
        },
        null,
        2
      );
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(path.resolve(publicDir, 'version.json'), versionData);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: buildVersion,
            builtAt: buildTime,
          },
          null,
          2
        ),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), appVersionPlugin()],
});
