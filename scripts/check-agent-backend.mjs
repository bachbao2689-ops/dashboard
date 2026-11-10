import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
// Resolve emitted .js specifiers to their TypeScript sources in this source-only check.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (specifier.endsWith('/server/agent.js')) {
      const source = new URL(specifier.replace(/\.js$/, '.ts'), context.parentURL);
      if (existsSync(source)) return nextResolve(source.href, context);
    }
    throw error;
  }
} });
const endpoint = await import('../Dev/api/agent.ts');
const rootEndpoint = await import('../api/agent.ts');

// Synthetic fixtures only: exercise the real SDK tool loop and HTTP handler
// without sending workspace data to a provider or writing to Supabase.
const savedFetch = globalThis.fetch;
const savedProvider = globalThis.AI_SDK_DEFAULT_PROVIDER;
const savedEnv = { ...process.env };
const actor = { id: 77, auth_id: '00000000-0000-4000-8000-000000000077', name: 'Fixture staff', role: 'staff', employment_level: 'Staff', department_id: '00000000-0000-4000-8000-000000000010', is_active: true };
let selectedTool = 'search_tasks';
let step = 0;
let writes = 0;
const reads = [];
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const request = body => new Request('https://fixture.invalid/api/agent', { method: 'POST', headers: { Authorization: 'Bearer fixture-session', 'Content-Type': 'application/json', Origin: 'https://fixture.invalid' }, body: JSON.stringify(body) });
try {
  assert.deepEqual(await (rootEndpoint.GET()).json(), await (endpoint.GET()).json());
  const health = endpoint.GET();
  assert.equal((await health.json()).service, 'dashboard-agent');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal((await endpoint.POST(new Request('https://fixture.invalid/api/agent', { method: 'DELETE' }))).status, 405);
  delete process.env.SUPABASE_URL; delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY; delete process.env.VITE_SUPABASE_ANON_KEY;
  assert.equal((await (await endpoint.POST(request({ message: 'Hello' }))).json()).code, 'SUPABASE_NOT_CONFIGURED');
  process.env.SUPABASE_URL = 'http://127.0.0.1:29130';
  delete process.env.VERCEL; delete process.env.VERCEL_ENV; delete process.env.VERCEL_GIT_COMMIT_REF;
  process.env.SUPABASE_ANON_KEY = 'fixture-publishable';
  const localBackend=process.env.SUPABASE_URL;
  let unexpectedNetwork=0;
  globalThis.fetch=async()=>{unexpectedNetwork++;throw Error('Blocked target must never reach the network');};
  for(const target of ['https://jxrwphjriuqbpdpwpqcn.supabase.co','https://samuuyxxtocqmtujnnhe.supabase.co']) {
    process.env.SUPABASE_URL=target;
    assert.equal((await (await endpoint.POST(request({message:'Blocked cloud'}))).json()).code,'BACKEND_TARGET_BLOCKED');
  }
  process.env.SUPABASE_URL=localBackend;
  process.env.VERCEL='1';process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='main';
  assert.equal((await (await endpoint.POST(request({message:'Blocked preview'}))).json()).code,'BACKEND_TARGET_BLOCKED');
  assert.equal(unexpectedNetwork,0,'Blocked local/Preview configurations cannot call cloud before authentication');
  delete process.env.VERCEL;delete process.env.VERCEL_ENV;delete process.env.VERCEL_GIT_COMMIT_REF;
  process.env.AI_AGENT_MODEL = 'fixture/model';
  process.env.AI_AGENT_APPROVAL_SECRET = 'fixture-only-secret-with-more-than-32-characters';
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    assert.equal(url.origin, 'http://127.0.0.1:29130', 'No external calls');
    if (url.pathname === '/auth/v1/user') return json({ id: actor.auth_id });
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-session', 'Tools keep caller JWT');
    if (url.pathname === '/rest/v1/users') return json(actor);
    if (url.pathname === '/rest/v1/departments') return json({ name: 'Fixture', workspace_id: '00000000-0000-4000-8000-000000000011' });
    if (url.pathname === '/rest/v1/tasks' && init?.method === 'POST') { writes++; return new Response(null, { status: 201 }); }
    if (['/rest/v1/tasks', '/rest/v1/project_subtasks', '/rest/v1/campaign_subtasks'].includes(url.pathname)) {
      reads.push(url.pathname);
      return json(url.pathname.endsWith('/tasks') ? [{ id: '00000000-0000-4000-8000-000000000020', title: 'Fixture task', status: 'todo', assignee_id: actor.id }] : []);
    }
    throw new Error(`Unexpected fixture endpoint: ${url.pathname}`);
  };
  globalThis.AI_SDK_DEFAULT_PROVIDER = { languageModel: () => ({
    specificationVersion: 'v3', provider: 'fixture', modelId: 'fixture/model', supportedUrls: {},
    doGenerate: async () => ({
      content: step++ === 0 ? [{ type: 'tool-call', toolCallId: 'fixture-call', toolName: selectedTool, input: JSON.stringify(selectedTool === 'search_tasks' ? { query: 'Fixture' } : { title: 'Fixture task', assigneeId: actor.id }) }] : [{ type: 'text', text: 'Fixture task' }],
      finishReason: { unified: step === 1 ? 'tool-calls' : 'stop', raw: 'fixture' },
      usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
    }),
  }) };
  assert.equal((await endpoint.POST(new Request('https://fixture.invalid/api/agent', { method: 'POST' }))).status, 401);
  const search = await endpoint.POST(request({ message: 'Find Fixture' }));
  const found = await search.json();
  assert.equal(search.status, 200, JSON.stringify(found));
  assert.equal(found.text, 'Fixture task');
  assert.equal(new Set(reads).size, 3, 'Search covers tasks and both subtask sources');
  assert.equal(writes, 0);
  selectedTool = 'propose_create_task'; step = 0;
  const proposed = await (await endpoint.POST(request({ message: 'Create Fixture task' }))).json();
  assert.equal(proposed.proposals?.length, 1, JSON.stringify(proposed));
  assert.equal(writes, 0, 'Proposal cannot write before approval');
  const token = proposed.proposals[0].token;
  assert.equal((await endpoint.POST(request({ action: 'execute', approvalToken: `${token}tampered` }))).status, 403);
  assert.equal(writes, 0);
  actor.id++;
  assert.equal((await endpoint.POST(request({ action: 'execute', approvalToken: token }))).status, 403, 'Approval belongs to its actor');
  actor.id--;
  assert.equal((await endpoint.POST(request({ action: 'execute', approvalToken: token }))).status, 200);
  assert.equal(writes, 1, 'Approved action creates a task');
  globalThis.AI_SDK_DEFAULT_PROVIDER.languageModel = () => ({ specificationVersion: 'v3', provider: 'fixture', modelId: 'fixture/model', supportedUrls: {}, doGenerate: async () => { throw Object.assign(new Error('AI Gateway requires a valid credit card on file to service requests.'), { statusCode: 403 }); } });
  const savedError = console.error; console.error = () => {};
  try { assert.equal((await (await endpoint.POST(request({ message: 'Hello' }))).json()).code, 'AI_GATEWAY_BILLING_REQUIRED'); } finally { console.error = savedError; }
  console.log('Agent backend checks passed: Web entry points, health JSON, configuration, JWT auth, real SDK tool loop, 3 task sources, approval before writes, signature rejection and task creation.');
} finally {
  globalThis.fetch = savedFetch;
  globalThis.AI_SDK_DEFAULT_PROVIDER = savedProvider;
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
}
