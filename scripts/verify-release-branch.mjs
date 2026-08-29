#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function git(repo, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  if (result.error) {
    throw new Error(`Unable to execute git ${args.join(' ')}: ${result.error.message}`);
  }
  if (!allowFailure && result.status !== 0) {
    const detail = (result.stderr || result.stdout || `exit status ${result.status}`).trim();
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
  return result;
}

export function validateReleaseBranch({ repo, approvedSha, releaseBranch, allowedPaths }) {
  if (!repo || !approvedSha || !releaseBranch || !Array.isArray(allowedPaths) || allowedPaths.length === 0) {
    throw new Error('repo, approvedSha, releaseBranch, and at least one allowed path are required.');
  }

  const currentSha = git(repo, ['rev-parse', 'HEAD']).stdout.trim();
  const remoteRef = `refs/heads/${releaseBranch}`;
  const remoteOutput = git(repo, ['ls-remote', 'origin', remoteRef]).stdout.trim();
  const remoteSha = remoteOutput.split(/\s+/u)[0] || '';
  if (!remoteSha) {
    throw new Error(`Release branch ${releaseBranch} does not exist on origin.`);
  }
  if (currentSha !== remoteSha) {
    throw new Error(`Local release ${currentSha} does not match remote tip ${remoteSha}.`);
  }

  const ancestry = git(repo, ['merge-base', '--is-ancestor', approvedSha, currentSha], { allowFailure: true });
  if (ancestry.status !== 0) {
    throw new Error(`Approved release ${approvedSha} is not an ancestor of ${currentSha}.`);
  }

  const changedPaths = git(repo, ['diff', '--name-only', approvedSha, currentSha, '--'])
    .stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const allowed = new Set(allowedPaths);
  const unexpectedPaths = changedPaths.filter((entry) => !allowed.has(entry));
  if (unexpectedPaths.length > 0) {
    throw new Error(`Release branch contains an unexpected path change: ${unexpectedPaths.join(', ')}`);
  }

  return { approvedSha, currentSha, remoteSha, changedPaths };
}

function parseArgs(argv) {
  const options = { allowedPaths: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for ${flag}.`);
    if (flag === '--repo') options.repo = path.resolve(value);
    else if (flag === '--approved-sha') options.approvedSha = value;
    else if (flag === '--release-branch') options.releaseBranch = value;
    else if (flag === '--allow-path') options.allowedPaths.push(value);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  return options;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  try {
    const result = validateReleaseBranch(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
