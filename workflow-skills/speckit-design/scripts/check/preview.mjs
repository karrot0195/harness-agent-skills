// design-system.html must render from the project's own stylesheet (system.md). A wrong relative
// link renders it unstyled, and live runs found that only by screenshotting the preview: a
// browser round-trip and a vision call per fix. A missing local stylesheet is checked directly.
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const PREVIEW = join('.commandcode', 'design', 'design-system.html');
const LINKED_CSS = /<link\b[^>]*href=["']([^"']+\.css)["']/gi;

/** @typedef {import('./contrast.mjs').Finding} Finding */

/** @param {string} root the project directory @returns {readonly Finding[]} */
export function checkPreviewLinks(root) {
	const preview = join(root, PREVIEW);
	if (!existsSync(preview)) return [];
	return [...readFileSync(preview, 'utf8').matchAll(LINKED_CSS)]
		.map(([, href = '']) => href)
		.filter(href => !/^(https?:)?\/\//.test(href))
		.filter(href => !existsSync(resolve(dirname(preview), href)))
		.map(href => ({
			level: 'FAIL',
			check: 'preview',
			source: preview,
			selector: `<link href="${href}">`,
			detail: `links ${href}, which does not exist from .commandcode/design/ — the preview renders without the project's stylesheet`,
		}));
}
