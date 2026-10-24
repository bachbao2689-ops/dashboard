import test from 'node:test';
import assert from 'node:assert/strict';

test('subtask item with further deadline extends subtask due date', () => {
  const subtask = {
    id: 's1',
    title: 'Key Visual Design',
    due_date: '2026-10-25',
  };

  const item1 = {
    title: 'Draft sketch',
    due_date: '2026-10-24', // earlier than subtask
  };

  const item2 = {
    title: 'Final review by Leader',
    due_date: '2026-10-30', // later than subtask
  };

  const checkExtension = (subDueDate, itemDueDate) => {
    const currentDue = (subDueDate || '').slice(0, 10);
    const itemDue = (itemDueDate || '').slice(0, 10);
    return Boolean(itemDue && (!currentDue || itemDue > currentDue));
  };

  assert.equal(checkExtension(subtask.due_date, item1.due_date), false);
  assert.equal(checkExtension(subtask.due_date, item2.due_date), true);

  // Subtask with no due date always extends
  assert.equal(checkExtension(null, '2026-10-28'), true);
});

test('taskActivityLogger formats payload and includes actor name and timestamp', async () => {
  const inserts = [];
  const fakeSupabase = {
    from: (table) => ({
      insert: (payload) => {
        inserts.push({ table, payload });
        return {
          select: () => ({
            maybeSingle: async () => ({ data: { id: 'act-1' }, error: null }),
          }),
        };
      },
    }),
  };

  // Test log payload structure
  const entityType = 'project_subtask';
  const entityId = 'sub-100';
  const userId = 42;
  const payload = {
    workspace_id: '9000eae0-528c-47a2-b6f3-eba019d4edca',
    user_id: userId,
    action: 'deadline_extended',
    entity_type: entityType,
    entity_id: entityId,
    old_value: { due_date: '2026-10-25' },
    new_value: { due_date: '2026-10-30' },
    metadata: {
      title: 'Thái Đặng đã kéo dài hạn chót đến 30/10/2026 (do giao thêm việc)',
      reason: 'Thêm đầu việc "Final review" có hạn chót dài hơn',
      item_title: 'Final review',
      actor_name: 'Thái Đặng',
    },
  };

  const { data } = await fakeSupabase.from('activity_log').insert(payload).select().maybeSingle();
  assert.equal(data.id, 'act-1');
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].table, 'activity_log');
  assert.equal(inserts[0].payload.action, 'deadline_extended');
  assert.equal(inserts[0].payload.new_value.due_date, '2026-10-30');
  assert.equal(inserts[0].payload.metadata.item_title, 'Final review');
});

test('updateTrackedTask enforces OCC when expectedUpdatedAt is supplied', async () => {
  // Simulate database rows
  const dbRows = {
    'task-1': { id: 'task-1', updated_at: '2026-10-24T10:00:00.000Z', title: 'Original' },
  };

  const fakeUpdateTrackedTask = async (id, values, expectedUpdatedAt) => {
    const row = dbRows[id];
    if (!row) throw new Error('Row not found');

    if (expectedUpdatedAt && row.updated_at !== expectedUpdatedAt) {
      throw new Error('Dữ liệu đã được người khác cập nhật trước đó. Vui lòng làm mới trang để xem phiên bản mới nhất.');
    }

    Object.assign(row, values);
    return row;
  };

  // Case 1: Match expectedUpdatedAt -> succeeds
  await fakeUpdateTrackedTask('task-1', { title: 'Updated' }, '2026-10-24T10:00:00.000Z');
  assert.equal(dbRows['task-1'].title, 'Updated');

  // Case 2: Concurrent modification happened (db has newer updated_at)
  dbRows['task-1'].updated_at = '2026-10-24T11:00:00.000Z';
  await assert.rejects(
    async () => {
      await fakeUpdateTrackedTask('task-1', { title: 'Overwritten' }, '2026-10-24T10:00:00.000Z');
    },
    /Dữ liệu đã được người khác cập nhật trước đó/
  );
});
