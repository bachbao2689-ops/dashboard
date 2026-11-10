export type BackendMode = 'local' | 'main';
export const MAIN_BACKEND_ORIGIN = 'https://jxrwphjriuqbpdpwpqcn.supabase.co';
export const isLoopbackHost = (host: string) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host.toLowerCase());

/** Only a Production build of main may use the hosted database. Modes/CLI flags cannot opt local into cloud. */
export function resolveBackendMode(env: { VERCEL?: string; VERCEL_ENV?: string; VERCEL_GIT_COMMIT_REF?: string }): BackendMode {
  if (!env.VERCEL && !env.VERCEL_ENV) return 'local';
  if (env.VERCEL === '1' && env.VERCEL_ENV === 'production' && env.VERCEL_GIT_COMMIT_REF === 'main') return 'main';
  throw new Error('Chỉ Vercel Production từ nhánh main được dùng Supabase cloud. Dev/test chạy local.');
}

/** Validate before creating any Auth, REST, Realtime or Storage client. Never echo credentials. */
export function validateBackendTarget(appHost: string, backendUrl: string, mode: BackendMode = 'local') {
  let target: URL;
  try { target = new URL(backendUrl); } catch { throw new Error('Chưa cấu hình URL Supabase hợp lệ.'); }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password ||
      target.pathname !== '/' || target.search || target.hash) {
    throw new Error('URL Supabase phải là HTTP/HTTPS origin hợp lệ, không chứa đường dẫn hoặc thông tin đăng nhập.');
  }
  if (mode === 'local') {
    if (!isLoopbackHost(target.hostname)) throw new Error('Local phải kết nối Supabase local trên máy. Chạy npm run dev:local.');
    return;
  }
  if (mode !== 'main' || isLoopbackHost(appHost) || target.origin !== MAIN_BACKEND_ORIGIN) {
    throw new Error('Bản Main phải chạy online và kết nối đúng Supabase Main bằng HTTPS.');
  }
}
