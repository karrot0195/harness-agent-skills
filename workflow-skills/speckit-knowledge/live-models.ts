/**
 * The live half of the command-code-knowledge skill's model facts. reference/models.md is generated
 * at build time, so a model the catalog launched after this release is missing from it, and the
 * skill tells the model to "never invent a model id" — it then refuses to name the new model or pin
 * an agent to it. On activation the skill body gains a section built from the catalog this process
 * already holds (never a fetch): models the reference does not list, models the catalog has hidden
 * or dropped since, and known models whose window or effort levels changed. "This build" is the
 * catalog embedded in it, which the reference is generated from. No remote catalog, or a catalog
 * that matches this build, adds nothing.
 */

import {
	getSupportedEfforts,
	listSelectableModelIds,
} from '../../../config/known-models.js';
import {getInstalledModelCatalogManager} from '../../../model/catalog-manager.js';
import {
	type EffectiveModelCatalog,
	resolveCatalogModelStatus,
	getSnapshotEffectiveCatalog,
} from '../../../model/catalog-resolution.js';
import type {CatalogModelV1} from '../../../model/model-catalog-wire.js';
import {getKnownModelContextWindow} from '../../../model/model-registry.js';
import type {Skill} from '../../skill-registry.js';

export const KNOWLEDGE_SKILL_NAME = 'command-code-knowledge';

interface ModelBuckets {
	readonly added: readonly CatalogModelV1[];
	// Shipped ids the catalog hides or no longer carries.
	readonly hidden: readonly string[];
	// Shipped ids the catalog now serves in a shape this build cannot run (an unknown profile).
	readonly outdated: readonly string[];
	readonly changed: readonly CatalogModelV1[];
}

// 205_000 → '205K'; 1_000_000 → '1M'; 1_050_000 → '1.05M' — the reference table's spelling.
function formatContext(tokens: number): string {
	if (tokens < 1_000_000) return `${Math.round(tokens / 1000)}K`;
	const millions = tokens / 1_000_000;
	return `${Number.isInteger(millions) ? millions : millions.toFixed(2)}M`;
}

function formatEfforts(efforts: readonly string[] | null): string {
	return efforts && efforts.length > 0 ? efforts.join(', ') : '—';
}

function sameEfforts(
	left: readonly string[] | null,
	right: readonly string[] | null,
): boolean {
	return formatEfforts(left) === formatEfforts(right);
}

function modelRow(model: CatalogModelV1): string {
	return `| \`${model.id}\` | ${model.display.label} | ${formatContext(model.contextWindow)} | ${formatEfforts(model.reasoningEfforts)} |`;
}

function modelTable(models: readonly CatalogModelV1[]): string {
	return [
		'| Id (use EXACTLY this) | Name | Context | Efforts |',
		'|---|---|---|---|',
		...models.map(modelRow),
	].join('\n');
}

// The catalog this build ships, which the reference was generated from.
function builtCatalog(): EffectiveModelCatalog {
	return getSnapshotEffectiveCatalog({remoteDisabled: false});
}

// A known model whose served window or effort levels no longer match the embedded catalog the
// reference was generated from.
function changedSinceBuild(model: CatalogModelV1): boolean {
	const built = builtCatalog();
	const window = getKnownModelContextWindow(model.id, built);
	if (window !== undefined && window !== model.contextWindow) return true;
	return !sameEfforts(
		getSupportedEfforts(model.id, built),
		model.reasoningEfforts,
	);
}

export interface LiveModelSessionModel {
	readonly id: string;
	// The catalog the session model runs on: the session pin, which may be older than the section's.
	readonly catalog: EffectiveModelCatalog;
}

// A row answers to its id and its aliases, as the catalog resolves ids.
function rowNames(row: CatalogModelV1, id: string): boolean {
	return row.id === id || row.aliases.includes(id);
}

// The session model's row from the catalog it runs on, so the section never tells the model a
// window or effort levels the session is not running on; any other model's row as served.
interface ServedRowParams {
	readonly model: CatalogModelV1;
	readonly sessionModel?: LiveModelSessionModel;
}

function servedRow(params: ServedRowParams): CatalogModelV1 {
	const {model, sessionModel} = params;
	if (!sessionModel || !rowNames(model, sessionModel.id)) return model;
	return (
		sessionModel.catalog.catalog.models.find(row =>
			rowNames(row, sessionModel.id),
		) ?? model
	);
}

function bucketModels(params: {
	readonly effective: EffectiveModelCatalog;
	readonly sessionModel?: LiveModelSessionModel;
}): ModelBuckets {
	const {effective, sessionModel} = params;
	const known = listSelectableModelIds({catalog: builtCatalog()});
	const knownSet = new Set(known);
	const added: CatalogModelV1[] = [];
	const hidden: string[] = [];
	const changed: CatalogModelV1[] = [];
	for (const model of effective.catalog.models) {
		const {state} = resolveCatalogModelStatus({
			effective,
			modelId: model.id,
		});
		if (state === 'hidden' && knownSet.has(model.id)) {
			hidden.push(model.id);
			continue;
		}
		if (state !== 'selectable') continue;
		const row = servedRow({model, sessionModel});
		if (!knownSet.has(row.id)) {
			added.push(row);
			continue;
		}
		if (changedSinceBuild(row)) changed.push(row);
	}
	// A shipped id the catalog no longer carries at all (no row, no alias), or now marks update
	// required, is refused by /model and sub-agents too.
	const outdated: string[] = [];
	for (const id of known) {
		const {state} = resolveCatalogModelStatus({
			effective,
			modelId: id,
		});
		if (state === 'not-in-catalog') hidden.push(id);
		if (state === 'client-update-required') outdated.push(id);
	}
	return {added, hidden, outdated, changed};
}

export interface BuildLiveModelSectionParams {
	readonly catalog?: EffectiveModelCatalog;
	// The session's model and its pin, when the pin knows it: that row wins over `catalog`'s.
	readonly sessionModel?: LiveModelSessionModel;
}

/**
 * The "live model catalog" section for the knowledge skill, or '' when there is no remote catalog
 * or it differs from this build in nothing the reference covers. `catalog` defaults to the one this
 * process's catalog manager holds.
 */
export function buildLiveModelSection(
	params: BuildLiveModelSectionParams = {},
): string {
	const effective =
		params.catalog ?? getInstalledModelCatalogManager()?.getEffective();
	if (!effective) return '';
	const {added, hidden, outdated, changed} = bucketModels({
		effective,
		sessionModel: params.sessionModel,
	});
	if (added.length + hidden.length + outdated.length + changed.length === 0)
		return '';
	const parts = [
		'## Live model catalog (overrides reference/models.md)',
		'The model catalog in force now differs from the one `reference/models.md` was generated from. Where they disagree, this section wins. Prices and minimum plans for models listed here are not in the reference. Point the user at /model or https://commandcode.ai/docs for those.',
	];
	if (added.length > 0) {
		parts.push(
			`### Available models the reference does not list\nThese ids are valid for \`/model\`, \`--model\` and an agent file's \`model:\`.\n\n${modelTable(added)}`,
		);
	}
	if (changed.length > 0) {
		parts.push(
			`### Context window or efforts changed since the reference\n${modelTable(changed)}`,
		);
	}
	if (hidden.length > 0) {
		parts.push(
			`### No longer offered\nDo not recommend these or pin new agents to them: ${hidden
				.map(id => `\`${id}\``)
				.join(', ')}.`,
		);
	}
	if (outdated.length > 0) {
		parts.push(
			`### Needs a newer Command Code\nThis version cannot run these. Do not recommend them or pin agents to them; tell the user to update Command Code to use them: ${outdated
				.map(id => `\`${id}\``)
				.join(', ')}.`,
		);
	}
	return parts.join('\n\n');
}

// One built section, keyed by the inputs it was built from.
interface LiveModelSectionMemo {
	readonly catalog: EffectiveModelCatalog;
	readonly sessionModel: LiveModelSessionModel | undefined;
	readonly text: string;
}

function sameSessionModel(
	left: LiveModelSessionModel | undefined,
	right: LiveModelSessionModel | undefined,
): boolean {
	return left?.id === right?.id && left?.catalog === right?.catalog;
}

/**
 * The section built once per catalog and session model `getParams` answers with. A session hands in
 * its pin when the pin came from the live catalog, else the newest catalog, plus its own model held
 * to the pin — so every activation (the activate_skill tool, a `/command-code-knowledge` turn, an
 * inline mention) reads the same text until a catalog lands or /model re-pins.
 */
export function createLiveModelSectionCache(
	getParams: () => BuildLiveModelSectionParams,
): () => string {
	let cached: LiveModelSectionMemo | undefined;
	return () => {
		const {catalog, sessionModel} = getParams();
		if (!catalog) return '';
		if (
			cached?.catalog !== catalog ||
			!sameSessionModel(cached.sessionModel, sessionModel)
		) {
			cached = {
				catalog,
				sessionModel,
				text: buildLiveModelSection({catalog, sessionModel}),
			};
		}
		return cached.text;
	};
}

export interface AppendLiveModelSectionParams {
	readonly body: string;
	readonly section: string;
}

/** A skill body plus the live model section, when there is one. */
export function appendLiveModelSection(
	params: AppendLiveModelSectionParams,
): string {
	return params.section ? `${params.body}\n\n${params.section}` : params.body;
}

export interface WithLiveModelSectionParams {
	readonly skill: Skill;
	readonly section: () => string | Promise<string>;
}

/**
 * The bundled knowledge skill with the live model section on its body, so every path that loads the
 * body gets it; any other skill (a user skill of the same name included) is returned unchanged.
 */
export function withLiveModelSection(
	params: WithLiveModelSectionParams,
): Skill {
	const {skill} = params;
	if (skill.source !== 'bundled' || skill.name !== KNOWLEDGE_SKILL_NAME) {
		return skill;
	}
	return {
		...skill,
		loadBody: async () =>
			appendLiveModelSection({
				body: await skill.loadBody(),
				section: await params.section(),
			}),
	};
}
