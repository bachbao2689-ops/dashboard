export const maxDuration = 30;

export function GET() {
  return Response.json({ service: 'dashboard-agent', version: 3 }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    const { default: handler } = await import('../Dev/server/agent.ts');
    return await handler(request);
  } catch (error) {
    const failure = error as Error & { code?: string };
    console.error('Agent startup failed:', failure.message);
    return Response.json({ code: 'AGENT_STARTUP_FAILED', error: 'Agent chưa khởi động được trên server.', diagnostic: { code: failure.code || failure.name, module: failure.message.match(/Cannot find (?:package|module) ['"]([^'"]+)/)?.[1]?.split('/').pop() } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
