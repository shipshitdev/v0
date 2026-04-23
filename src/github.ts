import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScaffoldAnswers } from './types';

type RunResult = {
  code: number;
  logPath: string;
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCaptured(command: string, args: string[], cwd: string, logPath: string): Promise<RunResult> {
  await fs.mkdir(path.dirname(logPath), { recursive: true });

  return new Promise((resolve) => {
    const log = createWriteStream(logPath, { flags: 'a' });
    log.write(`\n$ ${command} ${args.join(' ')}\n`);

    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => log.write(chunk));
    child.stderr.on('data', (chunk: Buffer) => log.write(chunk));
    child.on('error', (error: NodeJS.ErrnoException) => {
      log.write(`\n${error.message}\n`);
      log.end(() => resolve({ code: error.code === 'ENOENT' ? 127 : 1, logPath }));
    });
    child.on('close', (code) => {
      log.end(() => resolve({ code: code ?? 1, logPath }));
    });
  });
}

async function mustRun(command: string, args: string[], cwd: string, logPath: string): Promise<void> {
  const result = await runCaptured(command, args, cwd, logPath);
  if (result.code !== 0) {
    throw new Error(`${command} ${args[0] ?? ''} failed with code ${result.code}. Output saved to ${result.logPath}.`);
  }
}

function repoDescription(scope: string): string {
  const firstLine = scope.split('\n')[0]?.trim() ?? '';
  return firstLine.length > 280 ? `${firstLine.slice(0, 277)}...` : firstLine;
}

async function ensureGitCommit(answers: ScaffoldAnswers, logPath: string): Promise<void> {
  const hasGitDir = await pathExists(path.join(answers.targetDir, '.git'));
  if (!hasGitDir) {
    await mustRun('git', ['init', '-b', 'main'], answers.targetDir, logPath);
  }

  await mustRun('git', ['add', '.'], answers.targetDir, logPath);
  await mustRun(
    'git',
    [
      '-c',
      'user.name=@shipshitdev/v0',
      '-c',
      'user.email=v0@shipshit.dev',
      'commit',
      '-m',
      'Initial scaffold from @shipshitdev/v0',
      '--allow-empty',
    ],
    answers.targetDir,
    logPath,
  );
}

export async function setupGithub(answers: ScaffoldAnswers): Promise<void> {
  if (!answers.github.enabled) return;

  const logPath = path.join(answers.targetDir, '.v0', 'github-output.log');
  await fs.writeFile(logPath, 'GitHub setup log\n');
  await mustRun('gh', ['auth', 'status'], answers.targetDir, logPath);
  await ensureGitCommit(answers, logPath);
  await mustRun(
    'gh',
    [
      'repo',
      'create',
      answers.github.repo,
      `--${answers.github.visibility}`,
      '--source',
      '.',
      '--remote',
      'origin',
      '--push',
      '--description',
      repoDescription(answers.scope),
    ],
    answers.targetDir,
    logPath,
  );

  if (answers.github.createIssue) {
    await mustRun(
      'gh',
      [
        'issue',
        'create',
        '--title',
        `Shape ${answers.projectName} from v0 scope`,
        '--body-file',
        path.join(answers.targetDir, '.v0', 'scope.md'),
      ],
      answers.targetDir,
      logPath,
    );
  }
}
