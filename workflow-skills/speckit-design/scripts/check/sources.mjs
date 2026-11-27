// What check.mjs reads: .html/.htm documents (inline <style> and linked local stylesheets) and
// .css files. Component files are counted, not read, so a project written in them is reported as
// unchecked instead of passing clean.
//
// Sheets are grouped into cascades. Each document is one, its <style> blocks and linked sheets in
// document order: a linked sheet after an inline one overrides its tokens, and reading files first
// once hid a real 2.32:1 FAIL. Stylesheets no document links form one more cascade whose order is
// unknown, so check.mjs reports a token they set differently as unverified, not pass or fail.
// Local @import is followed, imported sheet first, and an href starting with / resolves against
// the scan root: either one missed once dropped a sheet's tokens out of its document.
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {stripComments} from './css.mjs';

// Dependencies, VCS, and build output. Generated CSS is not where a fix belongs.
const SKIPPED_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'out',
	'.next',
	'.nuxt',
	'.svelte-kit',
	'.output',
	'.turbo',
	'.vercel',
	'.cache',
	'vendor',
	'coverage',
]);
// .commandcode holds reports and templates, not product UI, except /design variants' output.
const COMMANDCODE_DIR = '.commandcode';
const CHECKED_COMMANDCODE_DIRS = new Set(['variants']);
// variants.md's untouched copy of the original: its defects are already reported on the real
// files, and reporting them twice invites a fix to a snapshot.
const VARIANTS_SNAPSHOT = [COMMANDCODE_DIR, 'variants', 'original.html'].join(
	sep,
);
const DOCUMENT_EXTENSIONS = new Set(['.html', '.htm']);
const COMPONENT_EXTENSIONS = new Set([
	'.jsx',
	'.tsx',
	'.vue',
	'.svelte',
	'.astro',
]);
// A <style> block or a <link> tag, in the order the document has them.
const SHEET_TAG = /<style[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*>/gi;
const LINKED_CSS = /href=["']([^"']+\.css)["']/i;
const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']?([^"'()\s;]+\.css)/gi;

/** @typedef {{readonly source: string, readonly css: string}} Sheet */
/** @typedef {{readonly source: string, readonly html: string}} Document */
/** @typedef {{readonly sheets: readonly Sheet[], readonly ordered: boolean}} Cascade */

/**
 * .commandcode itself is walked so its variants/ folder is reached; anything else under it is
 * skipped. @param {readonly string[]} segments a path relative to the target, split
 */
function isSkippedSegments(segments) {
	return segments.some((segment, index) => {
		if (SKIPPED_DIRS.has(segment)) return true;
		const next = segments[index + 1];
		if (segment !== COMMANDCODE_DIR || next === undefined) return false;
		return !CHECKED_COMMANDCODE_DIRS.has(next);
	});
}

/** A path inside build output, dependencies, or .commandcode is skipped. */
function isSkippedPath({root, path}) {
	const relativePath = relative(root, path);
	if (relativePath.endsWith(VARIANTS_SNAPSHOT)) return true;
	return isSkippedSegments(relativePath.split(sep));
}

/** @param {{root: string, target: string}} params @returns {readonly string[]} */
function walk({root, target}) {
	if (statSync(target).isFile()) return [target];
	return readdirSync(target, {withFileTypes: true}).flatMap(entry => {
		const path = join(target, entry.name);
		if (isSkippedPath({root, path})) return [];
		if (entry.isDirectory()) return walk({root, target: path});
		return entry.isFile() ? [path] : [];
	});
}

/** @param {string} href */
function isLocal(href) {
	return !/^(https?:)?\/\//.test(href);
}

/** A sheet's CSS without comments. @param {string} path @returns {string | null} */
function readOptional(path) {
	try {
		return stripComments(readFileSync(path, 'utf8'));
	} catch {
		// A sheet that does not exist locally (typo, server route) is not this script's job.
		return null;
	}
}

/**
 * A local href as a path: `/…` from the scan root (the site root a dev server serves), anything
 * else from the file that references it. @returns {string | null}
 */
function hrefPath({href, from, root}) {
	if (!isLocal(href)) return null;
	const path = href.startsWith('/')
		? join(root, href)
		: resolve(dirname(from), href);
	return isSkippedPath({root, path}) ? null : path;
}

/** Local sheets a stylesheet @imports, in order. @param {{css: string, from: string, root: string}} params */
function importedPaths({css, from, root}) {
	return [...css.matchAll(CSS_IMPORT)].flatMap(([, href = '']) => {
		const path = hrefPath({href, from, root});
		return path ? [path] : [];
	});
}

/**
 * A sheet and what it imports, in cascade order: each import's own chain first, then the sheet.
 * `seen` breaks import cycles. @returns {readonly string[]}
 */
function importChain({path, root, read, seen = new Set()}) {
	if (seen.has(path)) return [];
	const css = read(path);
	if (css === null) return [];
	const within = new Set([...seen, path]);
	return [
		...importedPaths({css, from: path, root}).flatMap(imported =>
			importChain({path: imported, root, read, seen: within}),
		),
		path,
	];
}

/**
 * A document's sheets in document order, imports expanded. A file is returned as `{path}` so the
 * caller can read each one once.
 * @param {{document: Document, root: string, read: (path: string) => string | null}} params
 * @returns {readonly ({readonly path: string} | Sheet)[]}
 */
function documentSheetRefs({document, root, read}) {
	const chain = path =>
		importChain({path, root, read}).map(chained => ({path: chained}));
	return [...document.html.matchAll(SHEET_TAG)].flatMap(([tag, inline]) => {
		if (inline !== undefined) {
			const css = stripComments(inline);
			return [
				...importedPaths({css, from: document.source, root}).flatMap(
					chain,
				),
				{source: `${document.source} <style>`, css},
			];
		}
		const href = tag.match(LINKED_CSS)?.[1];
		const path = href
			? hrefPath({href, from: document.source, root})
			: null;
		return path ? chain(path) : [];
	});
}

/**
 * @param {string} root an absolute file or directory
 * @returns {{cascades: readonly Cascade[], sheets: readonly Sheet[], documents: readonly Document[], files: number, unread: number}}
 */
export function loadSources(root) {
	const base = statSync(root).isFile() ? dirname(root) : root;
	const paths = walk({root: base, target: root});
	const cssByPath = new Map();
	const read = path => {
		if (!cssByPath.has(path)) cssByPath.set(path, readOptional(path));
		return cssByPath.get(path) ?? null;
	};
	const documents = paths
		.filter(path => DOCUMENT_EXTENSIONS.has(extname(path)))
		.map(path => ({source: path, html: readFileSync(path, 'utf8')}));
	const documentRefs = documents.map(document =>
		documentSheetRefs({document, root: base, read}),
	);
	const linkedPaths = new Set(
		documentRefs.flat().flatMap(ref => ('path' in ref ? [ref.path] : [])),
	);
	const cssPaths = paths.filter(path => extname(path) === '.css');
	const importedByCss = new Set(
		cssPaths.flatMap(path =>
			importedPaths({css: read(path) ?? '', from: path, root: base}),
		),
	);
	// Unlinked sheets that no other sheet imports; each brings its own imports along. Sheets that
	// only import each other in a cycle have no such entry, so each one becomes its own.
	const unlinkedPaths = cssPaths.filter(path => !linkedPaths.has(path));
	const entries = unlinkedPaths.filter(path => !importedByCss.has(path));
	const reached = new Set(
		entries.flatMap(path => importChain({path, root: base, read})),
	);
	const unlinkedRoots = [
		...entries,
		...unlinkedPaths.filter(path => !reached.has(path)),
	];

	const toSheets = refs =>
		refs.flatMap(ref => {
			if (!('path' in ref)) return [ref];
			const css = read(ref.path);
			return css === null ? [] : [{source: ref.path, css}];
		});
	const unlinked = toSheets(
		unlinkedRoots.flatMap(path =>
			importChain({path, root: base, read}).map(chained => ({
				path: chained,
			})),
		),
	);
	const cascades = [
		...documentRefs.map(refs => ({sheets: toSheets(refs), ordered: true})),
		...(unlinked.length > 0
			? [{sheets: unlinked, ordered: unlinkedRoots.length === 1}]
			: []),
	];
	const fileSheets = [...cssByPath].flatMap(([path, css]) =>
		css === null ? [] : [{source: path, css}],
	);
	const inlineSheets = documentRefs.flat().filter(ref => !('path' in ref));
	return {
		cascades,
		sheets: [...fileSheets, ...inlineSheets],
		documents,
		files: documents.length + fileSheets.length,
		unread: paths.filter(path => COMPONENT_EXTENSIONS.has(extname(path)))
			.length,
	};
}
