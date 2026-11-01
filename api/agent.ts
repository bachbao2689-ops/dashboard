import handler from '../Dev/server/agent.ts';

// Entry point when Vercel builds from the repository root.
export default { fetch: handler };
export const maxDuration = 30;
