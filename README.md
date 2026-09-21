# TeX Word Count

A live word count for LaTeX documents, in the status bar. No LaTeX Workshop required — it activates on VS Code's built-in `latex` language.

## What it shows

A single status bar item that adapts to context:

- `TeX: 4,210` — total words in the document
- `TeX: 4,210 · § 615` — plus the word count of the section containing the cursor
- `TeX: 4,210 · § 615 · sel 42` — plus the word count of the current selection

Hover the item for a breakdown (total, section title and count, selection). Click it to open the extension's settings.

## Counting rules

Word count is regex/parser-based, not a full LaTeX engine. It:

- Only counts between `\begin{document}` and `\end{document}` when that pair is present.
- Strips comments (an escaped `\%` is kept as a literal percent sign).
- Strips math (`$...$`, `\(...\)`, `\[...\]`, `equation`, `align`, and similar environments) unless `texWordCount.countMath` is enabled.
- Strips verbatim-like environments (`verbatim`, `lstlisting`, `minted`) entirely.
- Drops the arguments of commands that aren't prose: `\cite`, `\ref`, `\label`, `\usepackage`, `\includegraphics`, `\bibliography`, `\input`, `\include`, `\url`, and similar.
- Keeps the text argument of formatting commands such as `\textbf{...}` and `\emph{...}`, and of `\href{url}{text}` (the URL itself is dropped).
- Counts heading text (`\section{...}`, etc.) by default; toggle with `texWordCount.countHeadings`.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `texWordCount.countMath` | `false` | Count words inside math. |
| `texWordCount.countCaptions` | `true` | Count words inside `\caption{...}`. |
| `texWordCount.countFootnotes` | `true` | Count words inside `\footnote{...}`. |
| `texWordCount.countHeadings` | `true` | Count words inside heading commands. |
| `texWordCount.sectionIncludesSubsections` | `true` | Include subsection word counts in the section count shown in the status bar. |
| `texWordCount.showSection` | `true` | Show the current section's word count. |
| `texWordCount.showSelection` | `true` | Show the current selection's word count. |
| `texWordCount.extraSectionCommands` | `[]` | Extra command names (no backslash) to treat as `\section`-level headings, e.g. `["mysection"]`. |

## Known limitations

- Counts the current file only — `\input` and `\include` targets aren't followed.
- Regex-based counting won't exactly match TeXcount on unusual or heavily customized macros.
- Custom section commands aren't recognized unless added via `texWordCount.extraSectionCommands`.
- Files over 1 MB skip live updates while typing; the count still refreshes on save or when you switch back to the editor.

## Development

```bash
npm install
npm test       # unit tests for counter.ts and sections.ts
npm run build  # bundle to dist/extension.js
```

Press F5 in VS Code to launch an Extension Development Host with the extension loaded.
