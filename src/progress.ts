const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

type StepStatus = 'pending' | 'active' | 'done' | 'failed';

type ProgressPlan = {
  steps: Array<{
    label: string;
    status: StepStatus;
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

function icon(status: StepStatus, frame: number): string {
  if (status === 'done') return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'active') return `${FRAMES[frame]} loading`;
  return 'pending';
}

function renderPlan(): void {
  if (!plan || !process.stdout.isTTY) return;

  if (plan.renderedLines > 0) {
    process.stdout.write(`\x1b[${plan.renderedLines}A`);
  }

  const lines = plan.steps.map((step) => `${icon(step.status, plan?.frame ?? 0).padEnd(10)} ${step.label}`);
  for (const line of lines) {
    process.stdout.write(`\x1b[2K${line}\n`);
  }
  plan.renderedLines = lines.length;
}

function setPlanStep(label: string, status: StepStatus): void {
  if (!plan) return;
  const step = plan.steps.find((entry) => entry.label === label);
  if (!step) return;
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
  if (!process.stdout.isTTY) {
    console.log(`- ${label}`);
    try {
      const value = await task();
      console.log(`done ${label}`);
      return value;
    } catch (error) {
      console.log(`failed ${label}`);
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
  previousLength = writeLine(`${FRAMES[frame]} ${label}`, previousLength);

  const timer = setInterval(() => {
    frame = (frame + 1) % FRAMES.length;
    previousLength = writeLine(`${FRAMES[frame]} ${label}`, previousLength);
  }, 90);

  try {
    const value = await task();
    clearInterval(timer);
    previousLength = writeLine(`✓ ${label}`, previousLength);
    process.stdout.write('\n');
    return value;
  } catch (error) {
    clearInterval(timer);
    previousLength = writeLine(`✕ ${label}`, previousLength);
    process.stdout.write('\n');
    throw error;
  }
}
