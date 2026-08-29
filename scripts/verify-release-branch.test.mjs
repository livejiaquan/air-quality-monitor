import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateReleaseBranch } from './verify-release-branch.mjs';

const CLI_PATH = fileURLToPath(new URL('./verify-release-branch.mjs', import.meta.url));
const RELEASE_BRANCH = 'codex/unified-visual-refresh';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8' });
}

function cliArgs(repo, approvedSha, releaseBranch = RELEASE_BRANCH) {
  return [
    '--repo', repo,
    '--approved-sha', approvedSha,
    '--release-branch', releaseBranch,
    '--allow-path', 'aqi-latest.json',
  ];
}

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'aqi-release-guard-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remote.git');
  const repo = path.join(root, 'repo');
  git(root, 'init', '--bare', remote);
  git(root, 'clone', remote, repo);
  git(repo, 'config', 'user.name', 'test');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  await writeFile(path.join(repo, 'app.js'), 'approved\n');
  await writeFile(path.join(repo, 'aqi-latest.json'), '{"version":1}\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'approved release');
  git(repo, 'branch', '-M', RELEASE_BRANCH);
  git(repo, 'push', '-u', 'origin', RELEASE_BRANCH);
  const approvedSha = git(repo, 'rev-parse', 'HEAD');
  return { repo, approvedSha };
}

test('accepts a remote cache-only descendant of the approved release through API and CLI', async (t) => {
  const { repo, approvedSha } = await fixture(t);
  await writeFile(path.join(repo, 'aqi-latest.json'), '{"version":2}\n');
  git(repo, 'add', 'aqi-latest.json');
  git(repo, 'commit', '-m', 'refresh cache');
  git(repo, 'push');

  const result = validateReleaseBranch({
    repo,
    approvedSha,
    releaseBranch: RELEASE_BRANCH,
    allowedPaths: ['aqi-latest.json'],
  });
  assert.equal(result.currentSha, git(repo, 'rev-parse', 'HEAD'));
  assert.deepEqual(result.changedPaths, ['aqi-latest.json']);

  const cli = runCli(cliArgs(repo, approvedSha));
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout).changedPaths, ['aqi-latest.json']);
});

test('rejects code drift even when the approved release is an ancestor', async (t) => {
  const { repo, approvedSha } = await fixture(t);
  await writeFile(path.join(repo, 'app.js'), 'changed\n');
  git(repo, 'add', 'app.js');
  git(repo, 'commit', '-m', 'change code');
  git(repo, 'push');

  assert.throws(() => validateReleaseBranch({
    repo,
    approvedSha,
    releaseBranch: RELEASE_BRANCH,
    allowedPaths: ['aqi-latest.json'],
  }), /unexpected path.*app\.js/i);
});

test('rejects a rename that deletes an allowed path but adds an unknown path', async (t) => {
  const { repo, approvedSha } = await fixture(t);
  git(repo, 'mv', 'aqi-latest.json', 'renamed-cache.json');
  git(repo, 'commit', '-m', 'rename cache');
  git(repo, 'push');

  assert.throws(() => validateReleaseBranch({
    repo,
    approvedSha,
    releaseBranch: RELEASE_BRANCH,
    allowedPaths: ['aqi-latest.json'],
  }), /unexpected path.*renamed-cache\.json/i);
});

test('rejects a remote branch that no longer descends from the approved release', async (t) => {
  const { repo, approvedSha } = await fixture(t);
  git(repo, 'checkout', '--orphan', 'replacement');
  git(repo, 'rm', '-rf', '.');
  await writeFile(path.join(repo, 'aqi-latest.json'), '{"version":2}\n');
  git(repo, 'add', 'aqi-latest.json');
  git(repo, 'commit', '-m', 'replace history');
  git(repo, 'push', '--force', 'origin', `HEAD:${RELEASE_BRANCH}`);

  assert.throws(() => validateReleaseBranch({
    repo,
    approvedSha,
    releaseBranch: RELEASE_BRANCH,
    allowedPaths: ['aqi-latest.json'],
  }), /not an ancestor/i);
});

test('rejects a stale local checkout when the remote branch moved', async (t) => {
  const { repo, approvedSha } = await fixture(t);
  const staleSha = git(repo, 'rev-parse', 'HEAD');
  await writeFile(path.join(repo, 'aqi-latest.json'), '{"version":2}\n');
  git(repo, 'add', 'aqi-latest.json');
  git(repo, 'commit', '-m', 'refresh cache');
  git(repo, 'push');
  git(repo, 'reset', '--hard', staleSha);

  assert.throws(() => validateReleaseBranch({
    repo,
    approvedSha,
    releaseBranch: RELEASE_BRANCH,
    allowedPaths: ['aqi-latest.json'],
  }), /does not match remote tip/i);
});

test('CLI rejects malformed arguments, missing branches, and invalid repositories safely', async (t) => {
  const { repo, approvedSha } = await fixture(t);
  const cases = [
    { args: [], error: /required/i },
    { args: ['--repo'], error: /missing value/i },
    { args: ['--unknown', 'value'], error: /unknown argument/i },
    { args: cliArgs(repo, approvedSha, 'missing-branch'), error: /does not exist on origin/i },
    { args: cliArgs(path.join(repo, 'missing-repository'), approvedSha), error: /git rev-parse HEAD failed/i },
  ];

  for (const entry of cases) {
    const result = runCli(entry.args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, entry.error);
    assert.equal(result.stdout, '');
  }
});
