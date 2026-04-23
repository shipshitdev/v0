import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runStep } from './progress';
import type { Agent, ScaffoldAnswers } from './types';

export function buildAgentPrompt(answers: ScaffoldAnswers): string {
  return `You are extending a freshly generated Shipshit.dev project scaffold.

Project: ${answers.projectName}
Scope: ${answers.scope}
App surfaces: ${answers.apps.join(', ')}
Routes: ${answers.routes.map((route) => `/${route}`).join(', ')}
UI package: @shipshitdev/ui
Default framework: Next.js

Your task:
1. Inspect the generated repo before editing.
2. Shape the product around the stated scope.
3. Generate real scoped page content for each default route instead of leaving generic placeholders.
4. Keep the default route contract intact: ${answers.routes.map((route) => `/${route}`).join(', ')}.
5. Use @shipshitdev/ui components first.
6. Keep the monorepo Bun/Turbo setup working.
7. Use Bun for install/script workflows.
8. Run relevant typecheck/build commands and fix issues.

Do not replace the scaffold with a different stack. Extend it.`;
}

type AgentRunResult = {
  code: number;
  logPath: string;
};

type AgentCommand = {
  command: string;
  args: string[];
};

function agentCommand(agent: Agent): AgentCommand {
  return agent === 'claude'
    ? { command: 'claude', args: ['-p'] }
    : { command: 'codex', args: ['exec', '--skip-git-repo-check', '-'] };
}

export function agentStepLabels(agent: Agent): string[] {
  return [
    `Prepare ${agent} agent log`,
    `Launch ${agent} scaffold process`,
    `Wait for ${agent} to inspect and edit repo`,
    `Check ${agent} scaffold result`,
  ];
}

async function prepareLogFile(command: string, args: string[], logPath: string): Promise<void> {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, `$ ${command} ${args.join(' ')}\n\n`);
}

function runWithStdin(command: string, args: string[], input: string, cwd: string, logPath: string): Promise<AgentRunResult> {
  return new Promise((resolve) => {
    const log = createWriteStream(logPath, { flags: 'a' });

    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => log.write(chunk));
    child.stderr.on('data', (chunk: Buffer) => log.write(chunk));
    child.stdin.on('error', () => undefined);

    child.on('error', (error: NodeJS.ErrnoException) => {
      log.write(`\n${error.message}\n`);
      log.end(() => resolve({ code: error.code === 'ENOENT' ? 127 : 1, logPath }));
    });
    child.on('close', (code) => {
      log.end(() => resolve({ code: code ?? 1, logPath }));
    });

    child.stdin.end(input);
  });
}

export async function runAgent(answers: ScaffoldAnswers): Promise<void> {
  const prompt = buildAgentPrompt(answers);
  const logPath = path.join(answers.targetDir, '.v0', 'agent-output.log');
  const { command, args } = agentCommand(answers.agent);

  await runStep(`Prepare ${answers.agent} agent log`, () => prepareLogFile(command, args, logPath));

  let running: Promise<AgentRunResult> | null = null;
  await runStep(`Launch ${answers.agent} scaffold process`, async () => {
    running = runWithStdin(command, args, prompt, answers.targetDir, logPath);
  });

  const result = await runStep(`Wait for ${answers.agent} to inspect and edit repo`, async () => {
    if (!running) {
      throw new Error(`Failed to launch ${answers.agent}. Prompt saved to .v0/agent-prompt.md.`);
    }

    return running;
  });

  await runStep(`Check ${answers.agent} scaffold result`, async () => {
    if (result.code === 127) {
      throw new Error(`${answers.agent} is not installed or not on PATH. Prompt saved to .v0/agent-prompt.md.`);
    }

    if (result.code !== 0) {
      throw new Error(`${answers.agent} exited with code ${result.code}. Output saved to ${result.logPath}.`);
    }
  });
}
