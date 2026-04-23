const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

type StepStatus = 'pending' | 'active' | 'done' | 'failed';

type ProgressPlan = {
  steps: Array<{
    label: string;
    status: StepStatus;
    startedAt?: number;
    finishedAt?: number;
  }>;
  renderedLines: number;
  frame: number;
};

let plan: ProgressPlan | null = null;

function writeLine(line: string, previousLength: number): number {
  const padding = Math.max(0, previousLength - line.length);
  process.stdout.write(`\r${line}${' '.repeat(padding)}`);
  return line.length;
}

function formatElapsed(ms: number): string {
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;

  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, '0')}m`;
  }

  return `${minutes}m${String(seconds).padStart(2, '0')}s`;
}

function statusText(step: ProgressPlan['steps'][number], frame: number): string {
  if (step.status === 'pending') return 'pending';

  const startedAt = step.startedAt ?? Date.now();
  const finishedAt = step.finishedAt ?? Date.now();
  const elapsed = formatElapsed(Math.max(0, finishedAt - startedAt));

  if (step.status === 'done') return `done ${elapsed}`;
  if (step.status === 'failed') return `failed ${elapsed}`;
  return `${FRAMES[frame]} ${elapsed}`;
}

function renderPlan(): void {
  if (!plan || !process.stdout.isTTY) return;

  if (plan.renderedLines > 0) {
    process.stdout.write(`\x1b[${plan.renderedLines}A`);
  }

  const lines = plan.steps.map((step) => `${statusText(step, plan?.frame ?? 0).padEnd(12)} ${step.label}`);
  for (const line of lines) {
    process.stdout.write(`\x1b[2K${line}\n`);
  }
  plan.renderedLines = lines.length;
}

function setPlanStep(label: string, status: StepStatus): void {
  if (!plan) return;
  const step = plan.steps.find((entry) => entry.label === label);
  if (!step) return;
  const now = Date.now();
  if (status === 'active') {
    step.startedAt ??= now;
    step.finishedAt = undefined;
  } else if (status === 'done' || status === 'failed') {
    step.startedAt ??= now;
    step.finishedAt = now;
  }
  step.status = status;
  renderPlan();
}

export function configureProgressPlan(labels: string[]): void {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\n');
  plan = {
    steps: labels.map((label) => ({
      label,
      status: 'pending',
    })),
    renderedLines: 0,
    frame: 0,
  };
  renderPlan();
}

export function clearProgressPlan(): void {
  if (plan && process.stdout.isTTY) {
    process.stdout.write('\n');
  }
  plan = null;
}

export async function runStep<T>(label: string, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();

  if (!process.stdout.isTTY) {
    console.log(`- ${label}`);
    try {
      const value = await task();
      console.log(`done ${label} (${formatElapsed(Date.now() - startedAt)})`);
      return value;
    } catch (error) {
      console.log(`failed ${label} (${formatElapsed(Date.now() - startedAt)})`);
      throw error;
    }
  }

  if (plan) {
    setPlanStep(label, 'active');
    const timer = setInterval(() => {
      if (!plan) return;
      plan.frame = (plan.frame + 1) % FRAMES.length;
      renderPlan();
    }, 90);

    try {
      const value = await task();
      clearInterval(timer);
      setPlanStep(label, 'done');
      return value;
    } catch (error) {
      clearInterval(timer);
      setPlanStep(label, 'failed');
      throw error;
    }
  }

  let frame = 0;
  let previousLength = 0;
  previousLength = writeLine(`${FRAMES[frame]} ${formatElapsed(0).padEnd(7)} ${label}`, previousLength);

  const timer = setInterval(() => {
    frame = (frame + 1) % FRAMES.length;
    previousLength = writeLine(
      `${FRAMES[frame]} ${formatElapsed(Date.now() - startedAt).padEnd(7)} ${label}`,
      previousLength,
    );
  }, 90);

  try {
    const value = await task();
    clearInterval(timer);
    previousLength = writeLine(`✓ ${formatElapsed(Date.now() - startedAt).padEnd(7)} ${label}`, previousLength);
    process.stdout.write('\n');
    return value;
  } catch (error) {
    clearInterval(timer);
    previousLength = writeLine(`✕ ${formatElapsed(Date.now() - startedAt).padEnd(7)} ${label}`, previousLength);
    process.stdout.write('\n');
    throw error;
  }
}
