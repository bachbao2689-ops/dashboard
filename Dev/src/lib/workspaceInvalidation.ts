type Change = {
  table?: string;
  eventType?: string;
  new?: Record<string, any>;
};
type Actor = { id?: string | number; name?: string } | null | undefined;

function mentionsActor(ids: unknown, actor: Actor): boolean {
  return actor?.id != null && Array.isArray(ids) && ids.some(id => String(id) === String(actor.id));
}

/** Comment inserts only change task/workflow visibility for the mentioned actor. */
export function workspaceChangeRelevant(resource: 'tasks' | 'workflow', change: Change, actor: Actor): boolean {
  if (change.table === 'comments' && change.eventType === 'INSERT') {
    return mentionsActor(change.new?.mentions, actor);
  }
  if (change.table !== 'activity_log' || change.eventType === 'DELETE') return true;
  const action = change.new?.action;
  if (action === 'comment') {
    // Updates may remove a mention and revoke access; always reload those.
    if (change.eventType !== 'INSERT') return true;
    const metadata = change.new?.metadata;
    if (mentionsActor(metadata?.mentions, actor)) return true;
    // Older comments identify mentions by @name rather than structured IDs.
    const name = actor?.name?.replace(/ /g, '').toLowerCase();
    return Boolean(name && String(metadata?.body || '').toLowerCase().includes(`@${name}`));
  }
  return action === (resource === 'tasks' ? 'details_updated' : 'attachment_added');
}
