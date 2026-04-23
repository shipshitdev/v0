import { spawn } from 'node:child_process';

export function hasCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'], {
      stdio: 'ignore',
    });

    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code !== 127));
  });
}
