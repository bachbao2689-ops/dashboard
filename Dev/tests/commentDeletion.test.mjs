import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { ownsComment, deleteOwnedComment } from '../src/lib/commentDeletion.ts';

function clientWithResponse(body, status = 200) {
  const requests = [];
  const client = createClient('https://comment-tests.supabase.co', 'test-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      requests.push({ url: new URL(String(url)), method: init?.method });
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { client, requests };
}

test('comment deletion belongs to the author regardless of account rank', () => {
  for (const role of ['member', 'leader', 'manager', 'admin']) {
    const actor = { id: 7, role };
    assert.equal(ownsComment(actor.id, 7), true, role);
    assert.equal(ownsComment(actor.id, '7'), true, role);
    assert.equal(ownsComment(actor.id, 8), false, role);
  }
  for (const [actor, author] of [[null, null], [undefined, undefined], [7, null], [null, 7], ['', '']]) {
    assert.equal(ownsComment(actor, author), false);
  }
});

test('every delete request scopes the author, comment and exact parent/type', async () => {
  for (const kind of ['task', 'project', 'campaign', 'project_subtask', 'campaign_subtask']) {
    const { client, requests } = clientWithResponse([{ id: 'comment-1' }]);
    await deleteOwnedComment(client, { kind, id: 'parent-1' }, 'comment-1', 7);
    assert.equal(requests.length, 1);
    const { url, method } = requests[0];
    assert.equal(method, 'DELETE');
    assert.equal(url.searchParams.get('id'), 'eq.comment-1');
    assert.equal(url.searchParams.get('select'), 'id');
    if (kind === 'task' || kind === 'project') {
      assert.equal(url.pathname, `/rest/v1/${kind === 'task' ? 'comments' : 'project_comments'}`);
      assert.equal(url.searchParams.get('author_id'), 'eq.7');
      assert.equal(url.searchParams.get(`${kind}_id`), 'eq.parent-1');
    } else {
      assert.equal(url.pathname, '/rest/v1/activity_log');
      assert.equal(url.searchParams.get('user_id'), 'eq.7');
      assert.equal(url.searchParams.get('entity_type'), `eq.${kind}`);
      assert.equal(url.searchParams.get('entity_id'), 'eq.parent-1');
      assert.equal(url.searchParams.get('action'), 'eq.comment');
    }
  }
});

test('RLS filtering to zero rows never counts as successful deletion', async () => {
  const { client } = clientWithResponse([]);
  await assert.rejects(deleteOwnedComment(client, { kind: 'task', id: 'parent-1' }, 'comment-1', 7), /không còn tồn tại/);
});

test('database errors and unexpected deleted rows are rejected', async () => {
  const denied = clientWithResponse({ code: '42501', message: 'permission denied' }, 403);
  await assert.rejects(deleteOwnedComment(denied.client, { kind: 'project', id: 'parent-1' }, 'comment-1', 7), { message: 'permission denied' });
  const mismatch = clientWithResponse([{ id: 'another-comment' }]);
  await assert.rejects(deleteOwnedComment(mismatch.client, { kind: 'campaign', id: 'parent-1' }, 'comment-1', 7));
});

test('missing identity and target are rejected before any request', async () => {
  const { client, requests } = clientWithResponse([{ id: 'comment-1' }]);
  for (const actor of [0, -1, NaN, undefined]) {
    await assert.rejects(deleteOwnedComment(client, { kind: 'task', id: 'parent-1' }, 'comment-1', actor));
  }
  await assert.rejects(deleteOwnedComment(client, { kind: 'task', id: '' }, 'comment-1', 7));
  await assert.rejects(deleteOwnedComment(client, { kind: 'task', id: 'parent-1' }, '', 7));
  assert.equal(requests.length, 0);
});
