---
name: "md-to-pdf"
description: "Export markdown to PDF with proper rendering (avoids raw markdown text)"
metadata:
  author: "simlive"
  source: "specs/001-static-scte35-pmt"
---

# Markdown to PDF Skill

Export markdown files to PDF with proper rendering. The default `pandoc` command fails due to missing LaTeX dependencies, and `wkhtmltopdf` on raw markdown renders unformatted text. This skill provides the correct pipeline.

## When to Use

- Converting markdown documentation, guidelines, or specifications to PDF format
- When you need properly formatted PDF output with tables, code blocks, and URLs rendered correctly
- When `pandoc` fails due to missing LaTeX packages or `wkhtmltopdf` on raw markdown

## When NOT to Use

- For simple text-to-PDF conversion (use `pandoc` directly with appropriate engine)
- For generating HTML instead of PDF
- For non-markdown formats

## Inputs

- `input.md`: The markdown file to convert (required)
- `output.pdf`: The target PDF file (optional, defaults to same basename)
- `--css`: Optional CSS file for custom styling (e.g., URL word-wrapping)
- `--pdf-engine`: Choose PDF engine (`weasyprint` or `wkhtmltopdf`)

## Deterministic Steps

1. Validate input file exists and is readable
2. Check if output PDF exists - if yes, skip (idempotent)
3. Run pandoc to convert markdown to HTML:
   ```bash
   pandoc "$input.md" -o "$tmp.html" --css="$css" --pdf-engine="$pdf-engine" 2>&1
   ```
4. Convert HTML to PDF:
   ```bash
   wkhtmltopdf "$tmp.html" "$output.pdf" 2>&1
   ```
4. Verify PDF was created and is valid
5. Clean up temporary HTML file

## Idempotency & Re-run Behavior

- Skips conversion if output PDF exists and has same modification time as input
- Cleans up temporary files on success
- Fails gracefully with clear error messages if dependencies are missing

## Failure Modes & Fixes

- **Missing LaTeX packages**: Use `--pdf-engine=weasyprint` (no LaTeX required)
- **Long URLs overflow**: Add CSS with `word-break: break-all` for tables
- **Missing dependencies**: Install `weasyprint` (`pip install weasyprint`) or `wkhtmltopdf` (`apt install wkhtmltopdf`)

## Done Criteria

- PDF file exists at target path
- PDF contains properly rendered content (not raw markdown)
- No temporary files remain
- Exit code 0 on success

## References

- pandoc documentation: https://pandoc.org/MANUAL.html#pdf-options
- weasyprint: https://github.com/kovacsi/weasyprint
- wkhtmltopdf: https://wkhtmltopdf.org/

## Example Usage

```bash
# Basic conversion with weasyprint (recommended)
pandoc epg-xml-espx-guideline.md -o epg-xml-espx-guideline.pdf --pdf-engine=weasyprint

# With custom CSS for URL word-wrapping
pandoc epg-xml-espx-guideline.md -o epg-xml-espx-guideline.pdf --pdf-engine=weasyprint --css=url-wrap.css

# Using wkhtmltopdf (alternative)
pandoc epg-xml-espx-guideline.md -o epg-xml-espx-guideline.html && wkhtmltopdf epg-xml-espx-guideline.html epg-xml-espx-guideline.pdf
```