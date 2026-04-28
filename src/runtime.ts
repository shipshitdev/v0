import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppSurface, ScaffoldAnswers } from './types';

type RunResult = {
  code: number;
  logPath: string;
};

function logPath(answers: ScaffoldAnswers, name: string): string {
  return path.join(answers.targetDir, '.v0', name);
}

async function runCaptured(command: string, args: string[], cwd: string, outputPath: string): Promise<RunResult> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve) => {
    const log = createWriteStream(outputPath, { flags: 'w' });
    log.write(`$ ${command} ${args.join(' ')}\n\n`);

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
      log.end(() => resolve({ code: error.code === 'ENOENT' ? 127 : 1, logPath: outputPath }));
    });
    child.on('close', (code) => {
      log.end(() => resolve({ code: code ?? 1, logPath: outputPath }));
    });
  });
}

export async function installDependencies(answers: ScaffoldAnswers): Promise<void> {
  const result = await runCaptured('bun', ['install'], answers.targetDir, logPath(answers, 'bun-install.log'));
  if (result.code !== 0) {
    throw new Error(`bun install failed with code ${result.code}. Output saved to ${result.logPath}.`);
  }
}

function scriptDescription(app: AppSurface): string {
  if (app === 'web') return 'apps/web landing page at http://localhost:3000';
  if (app === 'app') return 'apps/app product app at http://localhost:3001';
  if (app === 'desktop') return 'apps/desktop (Electron wrapper for apps/app)';
  if (app === 'mobile') return 'apps/mobile (Expo)';
  if (app === 'extension') return 'apps/extension (Plasmo)';
  if (app === 'cli') return 'apps/cli (Commander)';
  if (app === 'docs') return 'apps/docs Nextra site at http://localhost:3003';
  if (app === 'api') return 'apps/api NestJS API at http://localhost:3002';
  return `apps/${app}`;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function printAppScripts(answers: ScaffoldAnswers): void {
  const repoRoot = shellQuote(answers.targetDir);
  console.log('\nRepo root:');
  console.log(`  ${answers.targetDir}`);
  console.log('\nOpen a shell there with:');
  console.log(`  cd ${repoRoot}`);
  console.log('\nApp scripts from that repo:');
  for (const app of answers.apps) {
    console.log(`  bun run dev:${app.padEnd(9)} ${scriptDescription(app)}`);
  }

  if (!answers.apps.includes('web')) {
    console.log('\napps/web was not selected, so there is no landing page to start.');
  } else if (answers.start) {
    console.log('\napps/web was started automatically from that repo.');
  } else {
    console.log(`\nLanding page start skipped. Run: cd ${repoRoot} && bun run dev:web`);
  }
}

export async function startWebApp(answers: ScaffoldAnswers): Promise<void> {
  if (!answers.apps.includes('web')) return;

  const outputPath = logPath(answers, 'web-dev.log');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const log = await fs.open(outputPath, 'w');
  await log.write('$ bun run dev:web\n\n');

  const child = spawn('bun', ['run', 'dev:web'], {
    cwd: answers.targetDir,
    detached: true,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    stdio: ['ignore', log.fd, log.fd],
  });

  child.unref();
  await log.close();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      resolve();
    }, 1500);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`bun run dev:web exited early with code ${code ?? 1}. Output saved to ${outputPath}.`));
    });
  });

}

export function printStartedWebApp(answers: ScaffoldAnswers): void {
  if (!answers.apps.includes('web')) return;

  const quotedRoot = shellQuote(answers.targetDir);
  const log = logPath(answers, 'web-dev.log');
  console.log('\napps/web process:');
  console.log(`  Running from: ${answers.targetDir}`);
  console.log(`  Command: cd ${quotedRoot} && bun run dev:web`);
  console.log('  URL: http://localhost:3000');
  console.log(`  Log: ${log}`);
  console.log(`  Tail log: tail -f ${shellQuote(log)}`);
}
