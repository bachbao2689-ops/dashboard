import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { resolveBackendMode, validateBackendTarget } from './src/lib/backendTarget.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import { execFileSync } from 'node:child_process';
import type { Plugin, ViteDevServer } from 'vite';

function devDatasetPlugin(): Plugin {
  return {
    name: 'dev-dataset-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/dev/dataset-status', (_req, res) => {
        const statusFile = path.resolve(__dirname, '../.local-supabase/active-dataset.json');
        let data = { mode: 'local' };
        if (fs.existsSync(statusFile)) {
          try { data = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch {}
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      });

      server.middlewares.use('/api/dev/switch-dataset', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }
        let body = '';
        req.on('data', (chunk: Buffer | string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { mode } = JSON.parse(body || '{}');
            if (!['local', 'main'].includes(mode)) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid mode' }));
            }
            const scriptPath = path.resolve(__dirname, '../scripts/switch-dataset.mjs');
            execFileSync(process.execPath, [scriptPath, mode], { stdio: 'pipe' });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, mode }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
          }
        });
      });
    }
  };
}

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
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const backendMode = resolveBackendMode(process.env);
  validateBackendTarget(backendMode === 'local' ? 'localhost' : 'production-build', env.VITE_SUPABASE_URL || '', backendMode);
  if (backendMode === 'local' && (env.VITE_OFFICIAL_VIEW_URL || env.VITE_OFFICIAL_VIEW_KEY)) {
    throw new Error('Local không dùng Official/Main viewer. Chạy npm run local:backend để cập nhật cấu hình.');
  }
  return {
    plugins: [react(), appVersionPlugin(), devDatasetPlugin()],
    define: { __DASHBOARD_BACKEND_MODE__: JSON.stringify(backendMode) },
    // Development network requests (Auth/REST/Realtime) stay on this machine, including LAN previews.
    server: { headers: { 'Content-Security-Policy': "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:* http://[::1]:* ws://[::1]:*" } },
  };
});
