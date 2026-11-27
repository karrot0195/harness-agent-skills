// CSS reading for check.mjs: rules, declarations, tokens, and text size. A brace reader, not a CSS
// engine — it sees what each rule declares, not what cascades onto an element.
import {parseColor, resolveVars} from './color.mjs';

/** @typedef {{readonly selector: string, readonly body: string, readonly source: string}} Rule */

const BROWSER_ROOT_PX = 16;
const LARGE_TEXT_PX = 24;
const LARGE_BOLD_TEXT_PX = 18.66;
const BOLD_WEIGHT = 700;
// Where design tokens live: plain :root/html, and Tailwind v4's @theme block.
const TOKEN_SELECTORS = new Set([':root', 'html', '@theme']);
const PAGE_SELECTORS = new Set(['body', 'html', ':root']);
const IMPORTANT = /!important\s*$/i;

/** @param {string} css @returns {string} */
export function stripComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Depth-0 `prelude { body }` blocks. A `;` at depth 0 ends a statement at-rule (`@import …;`,
 * `@layer a, b;`) — without that, the statement became the next rule's prelude and swallowed it.
 * Quoted strings are skipped: a `}` in `content: "}"` once ended its rule early.
 */
function topLevelBlocks(css) {
	const blocks = [];
	let depth = 0;
	let start = 0;
	let bodyStart = 0;
	let prelude = '';
	let quote = '';
	for (let index = 0; index < css.length; index++) {
		const char = css[index];
		if (quote) {
			if (char === '\\') index++;
			if (char === quote) quote = '';
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}
		if (char === ';' && depth === 0) start = index + 1;
		if (char === '{' && depth === 0) {
			prelude = css.slice(start, index).trim();
			bodyStart = index + 1;
		}
		if (char === '{') depth++;
		if (char !== '}' || depth === 0) continue;
		depth--;
		if (depth !== 0) continue;
		blocks.push({prelude, body: css.slice(bodyStart, index)});
		start = index + 1;
	}
	return blocks;
}

/**
 * `@layer` is read through and `@theme` kept as a token block. `@media`, `@supports`,
 * `@container`, and keyframes are dropped with their contents: a conditional rule is not what
 * the page shows by default.
 */
function rulesFromBlock({prelude, body}) {
	if (!prelude.startsWith('@')) return [{selector: prelude, body}];
	if (/^@layer\b/i.test(prelude)) return parseRules(body);
	if (/^@theme\b/i.test(prelude)) return [{selector: '@theme', body}];
	return [];
}

/** Style rules in source order, without a source label. @param {string} css */
export function parseRules(css) {
	return topLevelBlocks(css).flatMap(rulesFromBlock);
}

/** @typedef {{readonly name: string, readonly value: string, readonly important: boolean}} Declaration */

/** @param {string} body @returns {readonly Declaration[]} */
function declarationList(body) {
	return body.split(';').flatMap(part => {
		const colon = part.indexOf(':');
		if (colon === -1) return [];
		const raw = part.slice(colon + 1);
		return [
			{
				name: part.slice(0, colon).trim().toLowerCase(),
				value: raw.replace(IMPORTANT, '').trim(),
				important: IMPORTANT.test(raw),
			},
		];
	});
}

/** @param {string} body @returns {Readonly<Record<string, string>>} */
export function declarations(body) {
	return Object.fromEntries(
		declarationList(body).map(({name, value}) => [name, value]),
	);
}

/** @param {Rule} rule @returns {readonly string[]} */
function selectorsOf(rule) {
	return rule.selector.split(',').map(selector => selector.trim());
}

/**
 * Root tokens as the cascade resolves them: a later value wins unless an earlier one was
 * `!important` and it is not. @param {readonly Rule[]} rules
 */
export function rootVars(rules) {
	const vars = {};
	const important = new Set();
	for (const rule of rules) {
		if (!selectorsOf(rule).some(selector => TOKEN_SELECTORS.has(selector)))
			continue;
		for (const decl of declarationList(rule.body)) {
			if (!decl.name.startsWith('--')) continue;
			if (important.has(decl.name) && !decl.important) continue;
			if (decl.important) important.add(decl.name);
			vars[decl.name] = decl.value;
		}
	}
	return vars;
}

/** A root font-size in px; `%`, `em`, and `rem` there resolve against the browser's 16px. */
function rootSizePx(value) {
	const match = value.match(/^([\d.]+)(px|%|r?em)$/);
	if (!match) return null;
	const size = Number.parseFloat(match[1] ?? '');
	if (match[2] === 'px') return size;
	if (match[2] === '%') return (BROWSER_ROOT_PX * size) / 100;
	return BROWSER_ROOT_PX * size;
}

/** The root font size `rem` resolves against: the last html/:root font-size, else 16px. */
export function rootFontSize(rules) {
	let px = BROWSER_ROOT_PX;
	for (const rule of rules) {
		if (
			!selectorsOf(rule).some(selector => /^(html|:root)$/.test(selector))
		)
			continue;
		px = rootSizePx(declarations(rule.body)['font-size'] ?? '') ?? px;
	}
	return px;
}

/** @param {{decl: Readonly<Record<string, string>>, vars: Readonly<Record<string, string>>}} params */
export function backgroundColor({decl, vars}) {
	const value = decl['background-color'] ?? decl.background;
	if (!value || /gradient|url\(/i.test(resolveVars({value, vars})))
		return null;
	return parseColor({value: value.split(/\s+(?![^(]*\))/)[0] ?? '', vars});
}

/** @param {Readonly<Record<string, string>>} decl */
export function hasBackground(decl) {
	const value =
		decl['background-color'] ?? decl.background ?? decl['background-image'];
	if (!value) return false;
	return !/^(transparent|none|inherit|initial|unset)$/i.test(value.trim());
}

/**
 * The last body/html/:root background, as the cascade resolves it, else white. `value` is what it
 * was written as, so a page color read through an unknowable token can be reported as unverified.
 * @returns {{readonly rgb: readonly number[], readonly value: string}}
 */
export function pageBackground({rules, vars}) {
	let page = {rgb: [1, 1, 1], value: ''};
	for (const rule of rules) {
		if (!selectorsOf(rule).some(selector => PAGE_SELECTORS.has(selector)))
			continue;
		const decl = declarations(rule.body);
		const value = decl['background-color'] ?? decl.background ?? '';
		if (!value) continue;
		const rgb = backgroundColor({decl, vars});
		if (rgb) page = {rgb, value};
		if (!rgb && /var\(/.test(value)) page = {...page, value};
	}
	return page;
}

/**
 * Tokens that sheets of unknown load order set to different values: which one wins is unknowable,
 * so a pair measured through one is unverified. @param {readonly (readonly Rule[])[]} sheetRules
 */
export function conflictingVars(sheetRules) {
	const values = new Map();
	for (const rules of sheetRules) {
		for (const [name, value] of Object.entries(rootVars(rules))) {
			values.set(name, new Set([...(values.get(name) ?? []), value]));
		}
	}
	return new Set(
		[...values].filter(([, set]) => set.size > 1).map(([name]) => name),
	);
}

/** @param {string | undefined} value @returns {number} */
function fontWeight(value) {
	if (value === 'bold' || value === 'bolder') return BOLD_WEIGHT;
	return Number.parseInt(value ?? '', 10) || 400;
}

/**
 * WCAG text size: 'large' (24px, or 18.66px bold), 'normal', or 'unknown' when the size depends on
 * the parent (`em`, `%`, keywords, `clamp()`). No font-size at all is body text: 'normal'.
 * @param {{decl: Readonly<Record<string, string>>, rootPx: number}} params
 * @returns {'large' | 'normal' | 'unknown'}
 */
export function textSize({decl, rootPx}) {
	const value = decl['font-size'];
	if (!value) return 'normal';
	const match = value.match(/^([\d.]+)(px|rem)$/);
	if (!match) return 'unknown';
	const size = Number.parseFloat(match[1] ?? '');
	const px = match[2] === 'px' ? size : size * rootPx;
	if (px >= LARGE_TEXT_PX) return 'large';
	const bold = fontWeight(decl['font-weight']) >= BOLD_WEIGHT;
	return px >= LARGE_BOLD_TEXT_PX && bold ? 'large' : 'normal';
}
