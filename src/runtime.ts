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
  if (app === 'web') return 'apps/web marketing page at http://localhost:3000';
  if (app === 'app') return 'apps/app product shell at http://localhost:3001';
  if (app === 'desktop') return 'apps/desktop React shell at http://localhost:3010';
  if (app === 'mobile') return 'apps/mobile React shell at http://localhost:3011';
  return 'apps/extension React shell at http://localhost:3012';
}

export function printAppScripts(answers: ScaffoldAnswers): void {
  console.log('\nApp scripts:');
  for (const app of answers.apps) {
    console.log(`  bun run dev:${app.padEnd(9)} ${scriptDescription(app)}`);
  }

  if (!answers.apps.includes('web')) {
    console.log('\napps/web was not selected, so there is no marketing page to start.');
  } else if (answers.start) {
    console.log('\nStarting the marketing page with: bun run dev:web');
  } else {
    console.log('\nMarketing page start skipped. Run bun run dev:web when ready.');
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

  console.log(`\nMarketing page started: http://localhost:3000`);
  console.log(`Server log: ${logPath(answers, 'web-dev.log')}`);
}
