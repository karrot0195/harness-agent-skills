// `check.mjs --pair <text> <background> …`: contrast for candidate colors before they are written.
// Live recolor runs wrote their own OKLCH and APCA math to try palettes, spent several calls on it,
// and got APCA numbers that disagreed with this script's. This is the same math the check uses.
import {apcaLc, parseColor, wcagRatio} from './color.mjs';
import {
	LARGE_APCA,
	LARGE_RATIO,
	NORMAL_APCA,
	NORMAL_RATIO,
} from './contrast.mjs';

/** @typedef {{readonly text: string, readonly background: string}} PairInput */

/** @param {readonly string[]} values text, background, text, background, … */
export function pairsFrom(values) {
	return values.flatMap((text, index) => {
		const background = values[index + 1];
		if (index % 2 !== 0 || background === undefined) return [];
		return [{text, background}];
	});
}

/**
 * Same levels as the full check: a WCAG miss is a FAIL, an APCA-only miss a WARN.
 * @param {{label: string, ratio: number, lc: number, minRatio: number, minLc: number}} params
 */
function verdict({label, ratio, lc, minRatio, minLc}) {
	if (ratio < minRatio) return `${label} FAIL (needs ${minRatio}:1)`;
	if (lc < minLc) return `${label} WARN (APCA needs Lc ${minLc})`;
	return `${label} pass`;
}

/** @param {PairInput} pair @returns {string} */
export function describePair({text, background}) {
	const textRgb = parseColor({value: text, vars: {}});
	const backgroundRgb = parseColor({value: background, vars: {}});
	const name = `${text} on ${background}`;
	if (!textRgb || !backgroundRgb) {
		return `${name}: not measured — use an opaque hex, rgb(), hsl(), oklch(), or named color`;
	}
	const pair = {text: textRgb, background: backgroundRgb};
	const ratio = wcagRatio(pair);
	const lc = Math.abs(apcaLc(pair));
	return [
		`${name}: ${ratio.toFixed(2)}:1, APCA Lc ${lc.toFixed(0)}`,
		verdict({
			label: 'body text',
			ratio,
			lc,
			minRatio: NORMAL_RATIO,
			minLc: NORMAL_APCA,
		}),
		verdict({
			label: 'large text',
			ratio,
			lc,
			minRatio: LARGE_RATIO,
			minLc: LARGE_APCA,
		}),
	].join(' · ');
}
