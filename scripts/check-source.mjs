import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function git(root, args, input) {
  const result = spawnSync('git', args, { cwd: root, input, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Git source inspection failed. Check the repository and revision.');
  return result.stdout;
}

export function fileIssues(name, mode, policy) {
  const issues = [];
  const lower = name.toLowerCase();
  const pieces = name.split('/');
  const extension = path.posix.extname(lower);
  if (mode !== '100644' && mode !== '100755') issues.push('symlink, submodule or unsupported file mode');
  if (policy.localOnlyPrefixes.some(prefix => name.startsWith(prefix)) || policy.localOnlyFiles.includes(name)) issues.push('local-only file');
  if (policy.forbiddenExtensions.includes(extension)) issues.push('document, data export, credential or generated artifact');
  if (pieces.some(part => policy.forbiddenDirectories.includes(part.toLowerCase()))) issues.push('local tooling or generated directory');
  if (/^\.env(?:\.|$)/i.test(pieces.at(-1)) && !policy.allowedSpecialFiles.includes(name)) issues.push('environment file');
  if (!policy.allowedRootFiles.includes(name) && !policy.allowedRoots.includes(pieces[0])) issues.push('outside Dashboard source roots');
  if (!policy.allowedRootFiles.includes(name) && !policy.allowedSpecialFiles.includes(name) && !policy.allowedExtensions.includes(extension)) issues.push('unapproved source extension');
  return issues;
}

const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ['GitHub token', /\b(?:ghp_|gho_|github_pat_)[A-Za-z0-9_]{20,}\b/g],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{15,}\b/g],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['database credential URL', /postgres(?:ql)?:\/\/[^\s:/]+:([^\s/@]+)@/g],
  ['literal server secret', /(?:SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|GITHUB_TOKEN|DATABASE_PASSWORD|VAPID_PRIVATE_KEY|AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*[:=]\s*["']([^"'\r\n]{16,})["']/gi],
];

function placeholder(value) {
  return /^(?:REPLACE_|CHANGE_ME|YOUR_|EXAMPLE_|<)/i.test(value);
}

export function textIssues(name, buffer) {
  if (buffer.includes(0)) return [];
  const text = buffer.toString('utf8');
  const issues = [];
  const add = (kind, index) => issues.push(`${kind} at line ${text.slice(0, index).split('\n').length}`);
  for (const [kind, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match[1] && placeholder(match[1])) continue;
      add(kind, match.index);
    }
  }
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString());
      if (payload.role === 'service_role') add('service-role JWT', match.index);
    } catch { /* Non-JWT text is not a credential. */ }
  }
  if (name.endsWith('/.env.example')) {
    text.split('\n').forEach((line, index) => {
      const match = line.match(/^\s*([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL))\s*=\s*(.+?)\s*$/i);
      if (match && !placeholder(match[2])) issues.push(`credential template must be empty at line ${index + 1}`);
    });
  }
  return issues;
}

function readBlobs(root, ids) {
  if (!ids.length) return new Map();
  const data = git(root, ['cat-file', '--batch'], `${ids.join('\n')}\n`);
  const blobs = new Map();
  let offset = 0;
  for (const id of ids) {
    const end = data.indexOf(10, offset);
    const [actual, type, sizeString] = data.subarray(offset, end).toString().split(' ');
    const size = Number(sizeString);
    if (actual !== id || type !== 'blob' || !Number.isSafeInteger(size)) throw new Error('Invalid Git blob response.');
    offset = end + 1;
    blobs.set(id, data.subarray(offset, offset + size));
    offset += size + 1;
  }
  return blobs;
}

export function auditRepository(root, ref) {
  if (ref?.startsWith('-')) throw new Error('Invalid revision.');
  const raw = git(root, ref ? ['ls-tree', '-rz', ref, '--'] : ['ls-files', '--stage', '-z']);
  const entries = raw.toString().split('\0').filter(Boolean).map(line => {
    const separator = line.indexOf('\t');
    const [mode, second, third] = line.slice(0, separator).split(' ');
    if (!ref && third !== '0') throw new Error('Resolve index conflicts before publishing.');
    return { mode, id: ref ? third : second, name: line.slice(separator + 1) };
  });
  const blobs = readBlobs(root, [...new Set(entries.filter(entry => entry.mode !== '160000').map(entry => entry.id))]);
  const config = entries.find(entry => entry.name === 'source-policy.json');
  if (!config) throw new Error('source-policy.json must be tracked with the source.');
  const policy = JSON.parse(blobs.get(config.id).toString());
  const findings = entries.flatMap(entry => {
    const issues = fileIssues(entry.name, entry.mode, policy);
    const data = blobs.get(entry.id);
    if (data) issues.push(...textIssues(entry.name, data));
    return issues.map(issue => ({ file: entry.name, issue }));
  });
  return { count: entries.length, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && !(args.length === 1 && args[0] === '--index') && !(args.length === 2 && args[0] === '--ref')) throw new Error('Usage: node scripts/check-source.mjs [--index | --ref REVISION]');
    const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).toString().trim();
    const result = auditRepository(root, args[0] === '--ref' ? args[1] : undefined);
    for (const finding of result.findings) console.error(`${JSON.stringify(finding.file)}: ${finding.issue}`);
    if (result.findings.length) {
      console.error(`Source policy blocked ${result.findings.length} finding(s). Keep documents, agents and private files on the local machine.`);
      process.exitCode = 1;
    } else console.log(`Source policy passed: ${result.count} tracked files; no prohibited files or detected credentials.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
