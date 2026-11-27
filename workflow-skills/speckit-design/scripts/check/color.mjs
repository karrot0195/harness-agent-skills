// Color math and parsing for check.mjs. A color is gamma-encoded sRGB, each channel 0–1.
import {NAMED_COLORS} from './named-colors.mjs';

/** @typedef {readonly number[]} Rgb */
/** @typedef {{readonly rgb: Rgb, readonly alpha: number}} Color */
/** @typedef {Readonly<Record<string, string>>} Vars */

const MAX_VAR_DEPTH = 12;
// `#abc`, `rgb(…)`, and bare words — a word only counts when it is a named color.
const COLOR_LITERAL =
	/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch)\([^)]*\)|\b[a-z]+\b/gi;
// Not colors: a path such as url("blue/blue.webp") or a quoted string.
const NON_COLOR_TEXT = /url\([^)]*\)|"[^"]*"|'[^']*'/gi;
const VAR_NAME = /var\(\s*(--[\w-]+)/g;
const VAR_REFERENCE =
	/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g;

/** @param {number} c @returns {number} */
function toLinear(c) {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** @param {number} c @returns {number} */
function toGamma(c) {
	const clamped = Math.min(Math.max(c, 0), 1);
	return clamped <= 0.0031308
		? clamped * 12.92
		: 1.055 * clamped ** (1 / 2.4) - 0.055;
}

/** @param {{l: number, c: number, h: number}} oklch @returns {Rgb} */
function oklchToRgb({l, c, h}) {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
		-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
		-0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
	].map(toGamma);
}

/** Gamma sRGB → OKLCH, for hue and chroma checks. @param {Rgb} rgb */
export function rgbToOklch(rgb) {
	const [r, g, b] = rgb.map(toLinear);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const hue = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
	return {l: L, c: Math.hypot(A, B), h: hue};
}

/** @param {{h: number, s: number, l: number}} hsl @returns {Rgb} */
function hslToRgb({h, s, l}) {
	const k = n => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	return [0, 8, 4].map(
		n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)),
	);
}

/** @param {{text: Rgb, background: Rgb}} pair @returns {number} */
export function wcagRatio({text, background}) {
	const lum = rgb => {
		const [r, g, b] = rgb.map(toLinear);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const [hi, lo] = [lum(text), lum(background)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** APCA-W3 0.0.98G — the measure color.md defaults to. @param {{text: Rgb, background: Rgb}} pair */
export function apcaLc({text, background}) {
	const y = ([r, g, b]) => {
		const raw =
			0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
		// biome-ignore lint/suspicious/noApproximativeNumericConstant: APCA-W3 specifies blkClmp = 1.414 exactly; Math.SQRT2 would change the published formula.
		return raw < 0.022 ? raw + (0.022 - raw) ** 1.414 : raw;
	};
	const yText = y(text);
	const yBackground = y(background);
	if (Math.abs(yBackground - yText) < 0.0005) return 0;
	if (yBackground > yText) {
		const sapc = (yBackground ** 0.56 - yText ** 0.57) * 1.14;
		return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
	}
	const sapc = (yBackground ** 0.65 - yText ** 0.62) * 1.14;
	return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

/** @param {{value: string, vars: Vars, depth?: number}} params @returns {string} */
export function resolveVars({value, vars, depth = 0}) {
	if (depth > MAX_VAR_DEPTH) return value;
	const next = value.replace(
		VAR_REFERENCE,
		(_, name, fallback) => vars[name] ?? fallback ?? '',
	);
	if (next === value) return next;
	return resolveVars({value: next, vars, depth: depth + 1});
}

/** Every custom property a value reads, through the tokens it points at. */
export function referencedVars({value, vars, depth = 0}) {
	if (depth > MAX_VAR_DEPTH) return [];
	return [...value.matchAll(VAR_NAME)].flatMap(([, name = '']) => [
		name,
		...referencedVars({value: vars[name] ?? '', vars, depth: depth + 1}),
	]);
}

/**
 * Tokens a value reads that this cascade never sets and that have no fallback: the color is
 * defined somewhere this script did not see, so it cannot be measured.
 */
export function unresolvedVars({value, vars, depth = 0}) {
	if (depth > MAX_VAR_DEPTH) return [];
	return [...value.matchAll(VAR_REFERENCE)].flatMap(
		([, name = '', fallback]) => {
			const set = vars[name];
			if (set !== undefined)
				return unresolvedVars({value: set, vars, depth: depth + 1});
			if (fallback === undefined) return [name];
			return unresolvedVars({value: fallback, vars, depth: depth + 1});
		},
	);
}

/** `50%` → 0.5 × scale; a bare number is returned as is. @param {{token: string, scale?: number}} params */
function parseNumber({token, scale = 1}) {
	const text = token.trim();
	if (text.endsWith('%')) return (Number.parseFloat(text) / 100) * scale;
	return Number.parseFloat(text);
}

/** HSL saturation and lightness: `40%`, or a bare `40` (CSS Color 4) — both mean 0.4. */
function parseHslPercent(token) {
	return Number.parseFloat(token) / 100;
}

/** @param {string} digits @returns {Color | null} */
function readHex(digits) {
	if (![3, 4, 6, 8].includes(digits.length)) return null;
	const full =
		digits.length <= 4 ? [...digits].map(d => d + d).join('') : digits;
	const channels = [0, 2, 4, 6].map(
		i => Number.parseInt(full.slice(i, i + 2), 16) / 255,
	);
	const alpha = full.length === 8 ? (channels[3] ?? 1) : 1;
	return {rgb: channels.slice(0, 3), alpha};
}

/** @param {{space: string, parts: readonly string[]}} params @returns {Rgb} */
function channelsToRgb({space, parts}) {
	const [first = '', second = '', third = ''] = parts;
	if (space.startsWith('rgb')) {
		return [first, second, third].map(part =>
			part.endsWith('%')
				? parseNumber({token: part})
				: Number.parseFloat(part) / 255,
		);
	}
	if (space.startsWith('hsl')) {
		return hslToRgb({
			h: Number.parseFloat(first),
			s: parseHslPercent(second),
			l: parseHslPercent(third),
		});
	}
	return oklchToRgb({
		l: parseNumber({token: first}),
		c: parseNumber({token: second, scale: 0.4}),
		h: Number.parseFloat(third),
	});
}

/** Any color value, translucent or not, or null (gradient, keyword, unknown). */
function readColor({value, vars}) {
	const text = resolveVars({value, vars}).trim().toLowerCase();
	if (Object.hasOwn(NAMED_COLORS, text)) return readHex(NAMED_COLORS[text]);
	const hex = text.match(/^#([0-9a-f]{3,8})$/);
	if (hex) return readHex(hex[1] ?? '');
	const fn = text.match(/^(rgba?|hsla?|oklch)\(([^)]*)\)$/);
	if (!fn) return null;
	const [channels = '', slashAlpha] = (fn[2] ?? '').split('/');
	const parts = channels.split(/[\s,]+/).filter(Boolean);
	if (parts.length < 3) return null;
	const alphaToken = slashAlpha ?? parts[3];
	const alpha = alphaToken ? parseNumber({token: alphaToken}) : 1;
	return {rgb: channelsToRgb({space: fn[1] ?? '', parts}), alpha};
}

/** A solid, opaque color, or null. @param {{value: string, vars: Vars}} params @returns {Rgb | null} */
export function parseColor({value, vars}) {
	const color = readColor({value, vars});
	if (!color || color.alpha < 1) return null;
	return color.rgb;
}

/** Every color in a value, solid or not — for hue sweeps inside gradients and shadows. */
export function colorsIn({value, vars}) {
	const literals =
		resolveVars({value, vars})
			.replace(NON_COLOR_TEXT, ' ')
			.match(COLOR_LITERAL) ?? [];
	return literals
		.map(literal => readColor({value: literal, vars: {}})?.rgb ?? null)
		.filter(rgb => rgb !== null);
}
