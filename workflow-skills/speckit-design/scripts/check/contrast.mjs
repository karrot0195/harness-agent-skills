// Contrast for check.mjs: WCAG 2 AA on rules that set a text color, APCA as the second read.
import {
	apcaLc,
	parseColor,
	referencedVars,
	unresolvedVars,
	wcagRatio,
} from './color.mjs';
import {
	backgroundColor,
	declarations,
	hasBackground,
	textSize,
} from './css.mjs';

export const NORMAL_RATIO = 4.5;
export const LARGE_RATIO = 3;
export const NORMAL_APCA = 60;
export const LARGE_APCA = 45;
// Text measured only against the page background: below 2:1 it almost certainly sits on its own
// section backdrop (light text in a dark band), so reporting it is noise. Muted text on the page
// itself — the real failure — lands between 2:1 and the threshold.
const PAGE_PAIR_FLOOR = 2;
const UNMEASURED_STATE = /disabled|::?placeholder|::selection/i;

/** @typedef {import('./css.mjs').Rule} Rule */
/** @typedef {{level: 'FAIL' | 'WARN', check: string, source: string, selector: string, detail: string}} Finding */

/** @typedef {{readonly rgb: readonly number[], readonly value: string}} Page */

/**
 * Why a value's color is unknowable here: a token set differently in sheets of unknown order, or
 * a token this cascade never sets (an @import or link this script could not follow, a sheet only a
 * component imports). @returns {string | null}
 */
function unknowable({value, vars, uncertain}) {
	const conflicting = referencedVars({value, vars}).find(name =>
		uncertain.has(name),
	);
	if (conflicting)
		return `${conflicting} is set to different values in stylesheets whose load order is unknown`;
	const missing = unresolvedVars({value, vars})[0];
	if (missing)
		return `${missing} is not set in any stylesheet this check could tie to the rule`;
	return null;
}

/**
 * A pair read through a token whose value is unknown is not measured at all: a pass and a fail
 * are equally unfounded, and skipping it once hid a real 2.85:1 FAIL behind a clean report. Text
 * with no background of its own is measured against the page, so the page's tokens count too.
 * @param {{rule: Rule, decl: Readonly<Record<string, string>>, vars: Readonly<Record<string, string>>, uncertain: ReadonlySet<string>, page: Page}} params
 * @returns {Finding | null}
 */
function unverifiedFinding({rule, decl, vars, uncertain, page}) {
	const own = [decl.color, decl['background-color'], decl.background].join(
		' ',
	);
	const value = hasBackground(decl) ? own : `${own} ${page.value}`;
	const reason = unknowable({value, vars, uncertain});
	if (!reason) return null;
	return {
		level: 'WARN',
		check: 'contrast',
		source: rule.source,
		selector: rule.selector,
		detail: `unverified — ${reason}; measure the rendered page`,
	};
}

/**
 * @param {{rule: Rule, vars: Readonly<Record<string, string>>, uncertain: ReadonlySet<string>, page: Page, rootPx: number}} params
 * @returns {Finding | null}
 */
function contrastFinding({rule, vars, uncertain, page, rootPx}) {
	if (UNMEASURED_STATE.test(rule.selector)) return null;
	const decl = declarations(rule.body);
	if (!decl.color) return null;
	const unverified = unverifiedFinding({rule, decl, vars, uncertain, page});
	if (unverified) return unverified;
	const text = parseColor({value: decl.color, vars});
	if (!text) return null;
	const own = backgroundColor({decl, vars});
	// A background this script cannot measure (gradient, image, translucent) is still the text's
	// real backdrop — comparing against the page instead would be noise.
	if (!own && hasBackground(decl)) return null;

	const pair = {text, background: own ?? page.rgb};
	const ratio = wcagRatio(pair);
	if (!own && ratio < PAGE_PAIR_FLOOR) return null;
	const size = textSize({decl, rootPx});
	const needed = size === 'large' ? LARGE_RATIO : NORMAL_RATIO;
	const shown = `${ratio.toFixed(2)}:1`;
	const where = {source: rule.source, selector: rule.selector};
	const largeNote = size === 'large' ? ' (large text)' : '';

	if (own && size === 'unknown' && ratio >= LARGE_RATIO && ratio < needed) {
		return {
			level: 'WARN',
			check: 'contrast',
			...where,
			detail: `${shown} on its own background passes only as large text, and font-size ${decl['font-size']} depends on the parent — measure the rendered size`,
		};
	}
	if (own && ratio < needed) {
		return {
			level: 'FAIL',
			check: 'contrast',
			...where,
			detail: `${shown} on its own background, needs ${needed}:1${largeNote}`,
		};
	}
	if (ratio < needed) {
		return {
			level: 'WARN',
			check: 'contrast',
			...where,
			detail: `${shown} against the page background, needs ${needed}:1 — measure against the real parent`,
		};
	}
	const lc = Math.abs(apcaLc(pair));
	const apcaMin = size === 'large' ? LARGE_APCA : NORMAL_APCA;
	if (lc >= apcaMin) return null;
	return {
		level: 'WARN',
		check: 'apca',
		...where,
		detail: `Lc ${lc.toFixed(0)}, color.md minimum Lc ${apcaMin}${largeNote}`,
	};
}

/**
 * @param {{rules: readonly Rule[], vars: Readonly<Record<string, string>>, uncertain: ReadonlySet<string>, page: Page, rootPx: number}} params
 * @returns {readonly Finding[]}
 */
export function checkContrast({rules, vars, uncertain, page, rootPx}) {
	return rules.flatMap(rule => {
		const finding = contrastFinding({rule, vars, uncertain, page, rootPx});
		return finding ? [finding] : [];
	});
}
