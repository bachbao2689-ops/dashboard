import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { auditRepository, fileIssues, textIssues } from './check-source.mjs';

const policy = JSON.parse(readFileSync(new URL('../source-policy.json', import.meta.url)));

test('keeps runtime assets, migrations, tests and empty env templates', () => {
  for (const name of ['Dev/src/App.tsx', 'Dev/public/logo.svg', 'Dev/public/login/concept-2.png', 'Dev/supabase/migrations/fixture.sql', 'Dev/tests/task.test.mjs', 'backend/.env.example', '.github/workflows/source-policy.yml', '.githooks/pre-push']) {
    assert.deepEqual(fileIssues(name, '100644', policy), [], name);
  }
});

test('blocks documents, agents, datasets, generated files and credentials', () => {
  for (const name of ['AGENTS.md', 'README.MD', '.agents/config.json', 'GUIDELINE/style.md', 'Brief/notes.docx', 'Dev/.env.production', 'Dev/dist/index.html', 'Dev/public/debug.map', 'Dev/src/data/tasks.json', 'Dev/public/version.json', 'backend/.import-source.json', 'unrelated/file.js']) {
    assert.ok(fileIssues(name, '100644', policy).length, name);
  }
  assert.ok(fileIssues('Dev/src/link.ts', '120000', policy).length);
});

test('redacts credential findings and permits public Supabase configuration', () => {
  const cases = [
    '-----BEGIN ' + 'PRIVATE KEY-----',
    'ghp_' + 'a'.repeat(36),
    'sb_secret_' + 'b'.repeat(30),
    'postgresql:' + '//test:synthetic-password@db.example.invalid/test',
    'VERCEL_' + 'TOKEN=' + JSON.stringify('c'.repeat(28)),
    ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'signature'].join('.'),
  ];
  for (const value of cases) {
    const issues = textIssues('Dev/src/example.ts', Buffer.from(value));
    assert.ok(issues.length);
    assert.ok(issues.every(issue => !issue.includes(value)));
  }
  assert.deepEqual(textIssues('Dev/src/config.ts', Buffer.from('sb_publishable_' + 'd'.repeat(30))), []);
  assert.deepEqual(textIssues('backend/.env.example', Buffer.from('DATABASE_URL=\n')), []);
  assert.ok(textIssues('backend/.env.example', Buffer.from('DATABASE_URL=' + 'unexpected-value')).length);
});

test('reads staged/committed blobs, preserves filenames and accepts staged removals', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'dashboard-source-policy-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const put = (name, content) => {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), content);
  };
  try {
    git('init', '-q');
    put('source-policy.json', JSON.stringify(policy));
    put('Dev/src/app.ts', 'export const ready = true;\n');
    git('add', '.');
    assert.equal(auditRepository(root).findings.length, 0);
    git('-c', 'user.name=Source policy fixture', '-c', 'user.email=source@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture');
    put('Dev/src/app.ts', 'ghp_' + 'a'.repeat(36));
    assert.equal(auditRepository(root).findings.length, 0, 'unstaged data must not replace staged source');
    assert.equal(auditRepository(root, 'HEAD').findings.length, 0);
    const forbidden = 'Dev/src/private notes\nfixture.md';
    put(forbidden, 'fixture');
    git('add', forbidden);
    assert.ok(auditRepository(root).findings.some(finding => finding.file === forbidden));
    git('rm', '--cached', forbidden);
    assert.equal(auditRepository(root).findings.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
