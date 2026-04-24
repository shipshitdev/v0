import { collectAnswers } from './prompts';
import { setupGithub } from './github';
import { parseArgs } from './parse';
import { clearProgressPlan, configureProgressPlan, runStep } from './progress';
import { installDependencies, printAppScripts, printStartedWebApp, startWebApp } from './runtime';
import { agentStepLabels, runAgent } from './agent';
import { scaffoldProject, scaffoldStepLabels } from './scaffold';

function printHelp(): void {
  console.log(`@shipshitdev/v0

Usage:
  npx @shipshitdev/v0 <project-dir> [options]

Options:
  --scope <text>      Product scope for the scaffold agent
  --agent <agent>     claude or codex
  --apps <list>       web,app,desktop,mobile,extension,cli,docs
  --routes <list>     overview,new-task,search,inbox,activities
  --github            Create a GitHub repo with gh (default: off)
  --github-repo <n>   Repo name, or owner/repo
  --github-issue      Create a GitHub issue from the project scope
  --github-visibility private or public
  --skip-agent        Write files without launching Claude/Codex
  --no-install        Skip bun install
  --no-start          Skip starting apps/web
  --yes, -y           Use defaults for missing answers
`);
}

function progressLabels(answers: Awaited<ReturnType<typeof collectAnswers>>): string[] {
  const labels = [...scaffoldStepLabels(answers)];

  if (!answers.skipAgent) {
    labels.push(...agentStepLabels(answers.agent));
  }
  if (answers.github.enabled) {
    labels.push(answers.github.createIssue ? 'Create GitHub repo and issue' : 'Create GitHub repo');
  }
  if (answers.install) {
    labels.push('Install dependencies with Bun');
  }
  if (answers.start && answers.apps.includes('web')) {
    labels.push('Start apps/web landing page');
  }

  return labels;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const answers = await collectAnswers(options);
    configureProgressPlan(progressLabels(answers));
    await scaffoldProject(answers);

    if (!answers.skipAgent) {
      await runAgent(answers);
    }

    if (answers.github.enabled) {
      await runStep(answers.github.createIssue ? 'Create GitHub repo and issue' : 'Create GitHub repo', () => setupGithub(answers));
    }

    if (answers.install) {
      await runStep('Install dependencies with Bun', () => installDependencies(answers));
    }

    if (answers.start) {
      await runStep('Start apps/web landing page', () => startWebApp(answers));
    }

    clearProgressPlan();
    console.log(`\nCreated ${answers.projectName}`);
    console.log(`Location: ${answers.targetDir}`);
    console.log(`Apps: ${answers.apps.map((app) => `apps/${app}`).join(', ')}`);
    console.log(`Routes: ${answers.routes.map((route) => `/${route}`).join(', ')}`);
    if (answers.skipAgent) {
      console.log('Skipped agent launch. Prompt saved to .v0/agent-prompt.md.');
    }
    printAppScripts(answers);
    if (answers.start) {
      printStartedWebApp(answers);
    }
  } catch (error) {
    clearProgressPlan();
    if (error instanceof Error && error.message === '__HELP__') {
      printHelp();
      return;
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void main();
