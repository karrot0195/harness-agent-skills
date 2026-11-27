#!/usr/bin/env node
// /design check — the contrast measurements and reflex sweeps from color.md and reflexes.md,
// computed instead of eyeballed. Live runs showed models misjudging their own contrast ("4.4:1
// passes as bold" on 12px text) and missing reflexes their own gate listed (an indigo focus ring).
//
//   node check.mjs [project-dir-or-file] [--json]
//   node check.mjs --pair <text> <background> [<text> <background> …]
//
// --pair measures candidate colors before they are written, with the same WCAG and APCA math.
//
// Reads .html/.htm files (inline <style> and linked local stylesheets) and .css files under the
// target, skipping dependencies, build output, and .commandcode except /design variants'
// .commandcode/variants (check/sources.mjs). Each document is measured as its own cascade, its
// sheets in document order with local @import followed and /… hrefs resolved from the target. A
// pair read through a token that unlinked sheets of unknown order set differently, or that its
// cascade never sets, is reported unverified, not skipped. JSX, Vue, Svelte, and Astro
// files are counted but not read; when nothing was read the report says so instead of passing.
// Zero dependencies: it runs inside the user's project with nothing installed. Exit code 1 when
// any FAIL is found, 2 when the target does not exist.
//
// FAIL — WCAG 2 AA misses (4.5:1, or 3:1 for large text) on rules that set both a text color and a
//        solid background; purple-blue gradients; emoji in UI text.
// WARN — text checked only against the page background, between 2:1 and the threshold (the real
//        parent may differ; lower ratios mean the text sits on its own section), text whose size
//        depends on its parent and passes only as large text, APCA below color.md's minimums, and
//        the reflexes.md tells that need a decision rather than a ban.
// FAIL — also a .commandcode/design/design-system.html whose local stylesheet link is broken.
// Rules inside @media, @supports, and @container blocks and disabled states are not measured;
// @layer blocks are read through, and Tailwind v4 @theme tokens resolve like :root.
import {existsSync, realpathSync, statSync} from 'node:fs';
import {isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkContrast} from './check/contrast.mjs';
import {
	conflictingVars,
	pageBackground,
	parseRules,
	rootFontSize,
	rootVars,
} from './check/css.mjs';
import {describePair, pairsFrom} from './check/pair.mjs';
import {checkPreviewLinks} from './check/preview.mjs';
import {checkDocumentReflexes, checkStyleReflexes} from './check/reflexes.mjs';
import {loadSources} from './check/sources.mjs';

/** @param {readonly {css: string}[]} sheets */
function notation(sheets) {
	const css = sheets.map(sheet => sheet.css).join('\n');
	return {
		oklch: (css.match(/oklch\(/gi) ?? []).length,
		hex: (css.match(/#[0-9a-f]{3,8}\b/gi) ?? []).length,
	};
}

/** @param {import('./check/sources.mjs').Cascade} cascade */
function checkCascade({sheets, ordered}) {
	const sheetRules = sheets.map(sheet =>
		parseRules(sheet.css).map(rule => ({...rule, source: sheet.source})),
	);
	const rules = sheetRules.flat();
	const vars = rootVars(rules);
	return [
		...checkContrast({
			rules,
			vars,
			uncertain: ordered ? new Set() : conflictingVars(sheetRules),
			page: pageBackground({rules, vars}),
			rootPx: rootFontSize(rules),
		}),
		...checkStyleReflexes({rules, vars}),
	];
}

/** A stylesheet two documents share is measured in both; report each finding once. */
function uniqueFindings(findings) {
	const seen = new Set();
	return findings.filter(finding => {
		const key = JSON.stringify(finding);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** @param {string} target a project directory or a single file */
export function runDesignCheck(target) {
	const root = resolve(target);
	const {cascades, sheets, documents, files, unread} = loadSources(root);
	const previewFindings = statSync(root).isDirectory()
		? checkPreviewLinks(root)
		: [];
	const findings = uniqueFindings([
		...cascades.flatMap(checkCascade),
		...checkDocumentReflexes(documents),
		...previewFindings,
	]);
	return {findings, notation: notation(sheets), files, unread};
}

/** @param {number} unread */
function unreadNote(unread) {
	return `${unread} component file(s) (.jsx, .tsx, .vue, .svelte, .astro) were not read: their styles and class names are not measured.`;
}

/** @param {{report: ReturnType<typeof runDesignCheck>, target: string}} params */
function printReport({report, target}) {
	if (report.files === 0) {
		console.log(
			`design check: no files checked — found no .html, .htm, or .css under ${target} outside dependencies and build output. Nothing was measured; this is not a pass.`,
		);
		if (report.unread > 0) console.log(unreadNote(report.unread));
		return;
	}
	const base = resolve(target);
	const label = source =>
		isAbsolute(source) ? relative(base, source) || source : source;
	const ordered = ['FAIL', 'WARN'].flatMap(level =>
		report.findings.filter(finding => finding.level === level),
	);
	for (const f of ordered) {
		console.log(
			`${f.level}  ${f.check.padEnd(8)} ${label(f.source)}  ${f.selector}\n      ${f.detail}`,
		);
	}
	const fails = report.findings.filter(f => f.level === 'FAIL').length;
	const warns = report.findings.length - fails;
	console.log(
		`\ndesign check: ${fails} FAIL, ${warns} WARN across ${report.files} file(s) · colors: ${report.notation.oklch} oklch, ${report.notation.hex} hex`,
	);
	if (report.unread > 0) console.log(unreadNote(report.unread));
	if (fails > 0)
		console.log(
			'Each FAIL is a measured defect and each WARN needs a decision you can name. Which ones this turn fixes is set by its /design instructions, not by this script.',
		);
}

// fileURLToPath, not URL.pathname: pathname keeps percent-encoding (a space is %20) and a leading
// slash before a Windows drive, so the comparison failed and the script exited 0 without checking.
// realpath because Node resolves symlinks for import.meta.url (macOS /var is /private/var).
const isMain =
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	const args = process.argv.slice(2);
	if (args[0] === '--pair') {
		const pairs = pairsFrom(args.slice(1));
		if (pairs.length === 0) {
			console.error(
				'design check: --pair needs <text> <background> colors',
			);
			process.exit(2);
		}
		for (const pair of pairs) console.log(describePair(pair));
		process.exit(0);
	}
	const target = args.find(arg => !arg.startsWith('--')) ?? '.';
	if (!existsSync(target)) {
		console.error(`design check: ${target} does not exist`);
		process.exit(2);
	}
	const report = runDesignCheck(target);
	if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
	if (!args.includes('--json')) printReport({report, target});
	process.exit(report.findings.some(f => f.level === 'FAIL') ? 1 : 0);
}
