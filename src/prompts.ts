import { checkbox, confirm, input, select } from "@inquirer/prompts";
import path from "node:path";
import { hasCommand } from "./command";
import {
	AGENTS,
	AVAILABLE_APPS,
	type Agent,
	type AppSurface,
	type CliOptions,
	DEFAULT_APPS,
	DEFAULT_ROUTES,
	GITHUB_VISIBILITIES,
	type GithubVisibility,
	type RouteId,
	type ScaffoldAnswers,
} from "./types";

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function normalizePackageName(projectName: string): string {
	const slug = slugify(projectName);
	return slug || "shipshitdev-app";
}

async function detectInstalledAgents(): Promise<Agent[]> {
	const installed = await Promise.all(
		AGENTS.map(async (agent) => [agent, await hasCommand(agent)] as const),
	);
	return installed.filter(([, available]) => available).map(([agent]) => agent);
}

function formatAgents(agents: readonly Agent[]): string {
	return agents.join(" or ");
}

function routeLabel(route: RouteId): string {
	return route === "new-task"
		? "New Task"
		: route.charAt(0).toUpperCase() + route.slice(1);
}

export async function collectAnswers(
	options: CliOptions,
): Promise<ScaffoldAnswers> {
	const interactive = process.stdin.isTTY && !options.yes;

	const installedAgents = options.skipAgent
		? [...AGENTS]
		: await detectInstalledAgents();
	const ghInstalled = await hasCommand("gh");
	if (!options.skipAgent && installedAgents.length === 0) {
		throw new Error(
			"Neither codex nor claude is installed or available on PATH. Install one, or rerun with --skip-agent.",
		);
	}
	if (
		!options.skipAgent &&
		options.agent &&
		!installedAgents.includes(options.agent)
	) {
		throw new Error(
			`${options.agent} is not installed or available on PATH. Installed agents: ${formatAgents(installedAgents)}.`,
		);
	}
	if ((options.github || options.githubIssue) && !ghInstalled) {
		throw new Error(
			"GitHub setup requested, but gh is not installed or available on PATH.",
		);
	}
	if ((options.install || options.start) && !(await hasCommand("bun"))) {
		throw new Error(
			"Bun is not installed or available on PATH. Install Bun, or rerun with --no-install --no-start.",
		);
	}

	const targetDirInput =
		options.targetDir ??
		(interactive
			? await input({
					message: "Project directory",
					default: "my-app",
				})
			: "my-app");
	const targetDir = path.resolve(process.cwd(), targetDirInput);
	const projectName = normalizePackageName(path.basename(targetDir));
	const defaultAgent: Agent = installedAgents.includes("codex")
		? "codex"
		: (installedAgents[0] ?? "codex");
	const agent =
		options.agent ??
		(interactive
			? await select<Agent>({
					message: "Scaffold agent",
					default: defaultAgent,
					choices: installedAgents.map((agentOption) => ({
						name: agentOption,
						value: agentOption,
					})),
				})
			: defaultAgent);
	if (!installedAgents.includes(agent)) {
		throw new Error(
			`${agent} is not installed or available on PATH. Installed agents: ${formatAgents(installedAgents)}.`,
		);
	}
	const scope =
		options.scope ??
		(interactive
			? await input({
					message: "Project scope",
					default: "A focused Shipshit.dev product workspace",
				})
			: "A focused Shipshit.dev product workspace");
	const apps =
		options.apps ??
		(interactive
			? await checkbox<AppSurface>({
					message: "App surfaces",
					required: true,
					choices: AVAILABLE_APPS.map((app) => ({
						name: `apps/${app}`,
						value: app,
						checked: (DEFAULT_APPS as readonly AppSurface[]).includes(app),
					})),
				})
			: [...DEFAULT_APPS]);
	const routes =
		options.routes ??
		(interactive
			? await checkbox<RouteId>({
					message: "Default routes",
					required: true,
					choices: DEFAULT_ROUTES.map((route) => ({
						name: `/${route} - ${routeLabel(route)}`,
						value: route,
						checked: true,
					})),
				})
			: [...DEFAULT_ROUTES]);
	const githubDefault = Boolean(options.githubRepo);
	const githubEnabled =
		options.github ??
		options.githubIssue ??
		(interactive && ghInstalled
			? await confirm({
					message: `Create GitHub repo with gh?`,
					default: githubDefault,
				})
			: githubDefault);
	const githubRepo =
		options.githubRepo ??
		(githubEnabled && interactive
			? await input({
					message: "GitHub repo name",
					default: projectName,
				})
			: projectName);
	const githubVisibility =
		options.githubVisibility ??
		(githubEnabled && interactive
			? await select<GithubVisibility>({
					message: "GitHub repo visibility",
					default: "private",
					choices: GITHUB_VISIBILITIES.map((visibility) => ({
						name: visibility,
						value: visibility,
					})),
				})
			: "private");
	const githubIssue =
		githubEnabled &&
		(options.githubIssue ??
			(interactive
				? await confirm({
						message: "Create GitHub issue from project scope",
						default: true,
					})
				: false));

	return {
		projectName,
		packageName: normalizePackageName(projectName),
		targetDir,
		scope,
		agent,
		apps: apps as AppSurface[],
		routes: routes as RouteId[],
		skipAgent: options.skipAgent,
		install: options.install,
		start: options.start,
		github: {
			enabled: githubEnabled,
			createIssue: githubIssue,
			repo: githubRepo,
			visibility: githubVisibility,
		},
	};
}
