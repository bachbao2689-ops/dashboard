import handler from '../server/agent.ts';

// Web Request/Response handlers must use the fetch export contract.
export default { fetch: handler };
export const maxDuration = 30;
