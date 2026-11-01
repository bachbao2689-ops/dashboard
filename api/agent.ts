// Vercel deploys Functions from the project root. Keep the implementation in
// Dev/api so both the app-root and repository-root Vercel configurations work.
export { default } from '../Dev/api/agent.ts';

// Keep Agent requests within the AI SDK tool-loop timeout budget.
export const maxDuration = 30;
