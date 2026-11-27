// The reflexes.md sweeps for check.mjs: one function per tell, each returning {level, detail} or
// null, so adding a tell is one function and one line in the list.
import {colorsIn, resolveVars, rgbToOklch} from './color.mjs';
import {declarations} from './css.mjs';

/** @typedef {import('./css.mjs').Rule} Rule */
/** @typedef {import('./contrast.mjs').Finding} Finding */
/** @typedef {{level: 'FAIL' | 'WARN', detail: string}} Tell */
/** @typedef {Readonly<Record<string, string>>} Decl */
/** @typedef {Readonly<Record<string, string>>} Vars */

const REFLEX_FONTS = new Set([
	'inter',
	'roboto',
	'plus jakarta sans',
	'dm sans',
	'dm serif display',
	'playfair display',
	'space grotesk',
	'poppins',
	'montserrat',
]);
// reflexes.md: "purple-to-blue … indigo-to-violet, blue-purple-to-cyan, and every near neighbor".
const TECH_GRADIENT_HUES = {from: 190, to: 310};
// The indigo/violet family on its own: the generic tech accent.
const TECH_ACCENT_HUES = {from: 262, to: 305};
const TECH_MIN_CHROMA = 0.08;
const ACCENT_PROPERTIES = [
	'color',
	'background-color',
	'border-color',
	'outline-color',
	'outline',
	'box-shadow',
	'fill',
	'stroke',
];
const PILL_RADIUS = /(9{3,}|[1-9]\d{2,})px|50%/;
// Full rounding belongs to at most one component role; past this many selectors it is a default.
const PILL_SELECTOR_LIMIT = 2;
const THEATRICAL_BLUR_PX = 40;
// Emoji that render as emoji by default, or a pictograph forced to emoji with VS16. Text symbols
// such as ✓ and ★ are neither, so they pass.
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
const EYEBROW_CLASS = /\b(eyebrow|kicker|overline|pretitle|section-label)\b/i;

/** @param {{rgb: readonly number[], band: {from: number, to: number}}} params */
function inHueBand({rgb, band}) {
	const {c, h} = rgbToOklch(rgb);
	return c >= TECH_MIN_CHROMA && h >= band.from && h <= band.to;
}

/** @param {Decl} decl */
function backgroundImage(decl) {
	return decl['background-image'] ?? decl.background ?? '';
}

/**
 * The arguments of each `*-gradient(…)` in a value. Only these are color stops: a layered
 * `url("blue/blue.webp")` beside a gradient once counted as two blue stops.
 * @param {string} value @returns {readonly string[]}
 */
function gradientBodies(value) {
	return [...value.matchAll(/gradient\(/gi)].map(match => {
		const open = (match.index ?? 0) + match[0].length;
		let depth = 1;
		let index = open;
		for (; index < value.length && depth > 0; index++) {
			if (value[index] === '(') depth++;
			if (value[index] === ')') depth--;
		}
		return value.slice(open, index - 1);
	});
}

/** @param {{decl: Decl, vars: Vars}} params @returns {Tell | null} */
function techGradient({decl, vars}) {
	const value = resolveVars({value: backgroundImage(decl), vars});
	const tech = gradientBodies(value).some(
		body =>
			colorsIn({value: body, vars: {}}).filter(rgb =>
				inHueBand({rgb, band: TECH_GRADIENT_HUES}),
			).length >= 2,
	);
	if (!tech) return null;
	return {
		level: 'FAIL',
		detail: `purple-blue family gradient: 2+ stops at OKLCH hue ${TECH_GRADIENT_HUES.from}–${TECH_GRADIENT_HUES.to}, chroma ≥ ${TECH_MIN_CHROMA} (reflexes.md: Color and Surface)`,
	};
}

/** @param {{decl: Decl}} params @returns {Tell | null} */
function gradientText({decl}) {
	const clip =
		decl['background-clip'] ?? decl['-webkit-background-clip'] ?? '';
	if (!/text/i.test(clip) || !/gradient\(/i.test(backgroundImage(decl)))
		return null;
	return {
		level: 'WARN',
		detail: 'gradient text (reflexes.md: style hodgepodge) — needs a named request',
	};
}

/** @param {{decl: Decl, vars: Vars}} params @returns {Tell | null} */
function techAccent({decl, vars}) {
	const property = ACCENT_PROPERTIES.find(
		name =>
			decl[name] &&
			colorsIn({value: decl[name], vars}).some(rgb =>
				inHueBand({rgb, band: TECH_ACCENT_HUES}),
			),
	);
	if (!property) return null;
	return {
		level: 'WARN',
		detail: `indigo/violet ${property} (OKLCH hue ${TECH_ACCENT_HUES.from}–${TECH_ACCENT_HUES.to}, chroma ≥ ${TECH_MIN_CHROMA}) — the generic tech hue unless this product chose it on purpose`,
	};
}

/** @param {{decl: Decl}} params @returns {Tell | null} */
function glass({decl}) {
	if (!decl['backdrop-filter'] && !decl['-webkit-backdrop-filter'])
		return null;
	return {level: 'WARN', detail: 'backdrop-filter (glassmorphism)'};
}

/** @param {{decl: Decl}} params @returns {Tell | null} */
function theatricalShadow({decl}) {
	const blur = (decl['box-shadow'] ?? '').match(/\b0\s+(\d+)px\s+(\d+)px/);
	const px = Number(blur?.[2] ?? 0);
	if (px < THEATRICAL_BLUR_PX) return null;
	return {level: 'WARN', detail: `theatrical shadow (${px}px blur)`};
}

/** @param {{decl: Decl}} params @returns {Tell | null} */
function reflexFont({decl}) {
	const family = (decl['font-family'] ?? '')
		.split(',')[0]
		?.replace(/["']/g, '')
		.trim()
		.toLowerCase();
	if (!family || !REFLEX_FONTS.has(family)) return null;
	return {
		level: 'WARN',
		detail: `reflex font "${family}" — justify it or choose`,
	};
}

const RULE_TELLS = [
	techGradient,
	gradientText,
	techAccent,
	glass,
	theatricalShadow,
	reflexFont,
];

/** @param {{rule: Rule, vars: Vars}} params @returns {readonly Finding[]} */
function ruleFindings({rule, vars}) {
	const decl = declarations(rule.body);
	return RULE_TELLS.map(tell => tell({decl, vars}))
		.filter(found => found !== null)
		.map(({level, detail}) => ({
			level,
			check: 'reflex',
			source: rule.source,
			selector: rule.selector,
			detail,
		}));
}

/** @param {readonly Rule[]} rules @returns {readonly Finding[]} */
function pillFindings(rules) {
	const pills = rules
		.filter(rule =>
			PILL_RADIUS.test(declarations(rule.body)['border-radius'] ?? ''),
		)
		.map(rule => rule.selector);
	if (pills.length <= PILL_SELECTOR_LIMIT) return [];
	return [
		{
			level: 'WARN',
			check: 'reflex',
			source: 'stylesheets',
			selector: pills.slice(0, 4).join(' | '),
			detail: `pill radius on ${pills.length} selectors — full rounding belongs to at most one component role`,
		},
	];
}

/** @param {Vars} vars @returns {readonly Finding[]} */
function tokenFindings(vars) {
	return Object.entries(vars)
		.filter(([, value]) =>
			colorsIn({value, vars: {}}).some(rgb =>
				inHueBand({rgb, band: TECH_ACCENT_HUES}),
			),
		)
		.map(([name]) => ({
			level: 'WARN',
			check: 'reflex',
			source: ':root',
			selector: name,
			detail: `indigo/violet token (OKLCH hue ${TECH_ACCENT_HUES.from}–${TECH_ACCENT_HUES.to}, chroma ≥ ${TECH_MIN_CHROMA}) — the generic tech hue unless chosen on purpose`,
		}));
}

/** @param {{rules: readonly Rule[], vars: Vars}} params @returns {readonly Finding[]} */
export function checkStyleReflexes({rules, vars}) {
	return [
		...rules.flatMap(rule => ruleFindings({rule, vars})),
		...pillFindings(rules),
		...tokenFindings(vars),
	];
}

/** @param {import('./sources.mjs').Document} document @returns {readonly Finding[]} */
function documentFindings({source, html}) {
	const body = html.replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, '');
	const emoji = body.replace(/<[^>]+>/g, ' ').match(EMOJI);
	const emojiFindings = emoji
		? [
				{
					level: 'FAIL',
					check: 'reflex',
					source,
					selector: 'text',
					detail: `emoji in UI copy ("${emoji[0]}")`,
				},
			]
		: [];
	const eyebrows = [...body.matchAll(/<[^>]+class=["'][^"']*["'][^>]*>/gi)]
		.map(([tag]) => tag)
		.filter(tag => EYEBROW_CLASS.test(tag))
		.map(tag => ({
			level: 'WARN',
			check: 'reflex',
			source,
			selector: tag.slice(0, 60),
			detail: 'section eyebrow label above a heading',
		}));
	const exclamations = [
		...body.matchAll(/<(?:button|h[1-3])[^>]*>([^<]*!)\s*</gi),
	].map(([, label = '']) => ({
		level: 'WARN',
		check: 'copy',
		source,
		selector: label.trim().slice(0, 40),
		detail: 'exclamation point in a heading or button',
	}));
	return [...emojiFindings, ...eyebrows, ...exclamations];
}

/** @param {readonly import('./sources.mjs').Document[]} documents @returns {readonly Finding[]} */
export function checkDocumentReflexes(documents) {
	return documents.flatMap(documentFindings);
}
