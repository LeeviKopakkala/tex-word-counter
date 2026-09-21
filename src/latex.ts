// Pure LaTeX text-masking helpers shared by counter.ts and sections.ts.
// No vscode import: everything here operates on plain strings so it can be
// unit tested directly and reused for arbitrary line ranges.
//
// The general strategy is to "mask" text we don't want counted (or matched
// as a heading) by replacing it with spaces, one-for-one, so line and
// column positions in the result line up exactly with the input. Newlines
// are always preserved so line numbers never shift.

const VERBATIM_ENV_NAMES = ['verbatim\\*?', 'lstlisting', 'minted'];

const MATH_ENV_NAMES = new Set([
  'equation', 'equation*',
  'align', 'align*',
  'alignat', 'alignat*',
  'flalign', 'flalign*',
  'gather', 'gather*',
  'multline', 'multline*',
  'eqnarray', 'eqnarray*',
  'displaymath',
  'math',
]);

// Commands whose arguments are never prose: bibliography/cross-reference
// keys, file paths, package options, raw URLs, definitions, and layout
// tweaks. Everything (all optional and required argument groups
// immediately following the command) is dropped.
const NON_PROSE_COMMANDS = new Set([
  'cite', 'citep', 'citet', 'citeauthor', 'citeyear', 'nocite',
  'ref', 'eqref', 'pageref', 'autoref', 'nameref', 'label',
  'usepackage', 'RequirePackage', 'documentclass', 'documentstyle',
  'includegraphics', 'graphicspath',
  'bibliography', 'bibliographystyle', 'bibitem',
  'input', 'include', 'includeonly',
  'url',
  'newcommand', 'renewcommand', 'providecommand',
  'newenvironment', 'renewenvironment',
  'newtheorem', 'DeclareMathOperator',
  'definecolor', 'colorlet',
  'geometry', 'setlength', 'addtolength', 'setcounter', 'newcounter',
  'hypersetup', 'usetikzlibrary', 'numberwithin',
]);

const HEADING_COMMANDS_BASE = [
  'part', 'chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph',
];

export const HEADING_LEVELS: ReadonlyMap<string, number> = new Map(
  HEADING_COMMANDS_BASE.map((name, index) => [name, index]),
);

export interface MaskOptions {
  countMath: boolean;
  countCaptions: boolean;
  countFootnotes: boolean;
  countHeadings: boolean;
  /** Extra command names (no backslash, no star) to treat as \section-level headings. */
  extraSectionCommands?: readonly string[];
}

/**
 * Blanks the body of verbatim-like environments (verbatim, lstlisting,
 * minted) so their contents are never parsed as LaTeX or counted as prose.
 * Must run before stripComments, since verbatim content is not subject to
 * TeX escaping rules (a literal "%" inside verbatim is not a comment).
 */
export function blankVerbatimEnvironments(text: string): string {
  const out = text.split('');
  const beginRe = new RegExp(
    `\\\\begin\\{(${VERBATIM_ENV_NAMES.join('|')})\\}(?:\\[[^\\]\\n]*\\])?(?:\\{[^}\\n]*\\})?`,
    'g',
  );

  let match: RegExpExecArray | null;
  while ((match = beginRe.exec(text))) {
    const envName = match[1];
    const bodyStart = match.index + match[0].length;
    const endTag = `\\end{${envName}}`;
    const endIndex = text.indexOf(endTag, bodyStart);
    const blankEnd = endIndex === -1 ? text.length : endIndex + endTag.length;
    blankRange(out, match.index, blankEnd);
    beginRe.lastIndex = blankEnd;
  }

  return out.join('');
}

/**
 * Blanks TeX comments (an unescaped "%" through end of line). A "%" is a
 * comment marker unless it is preceded by an odd number of backslashes
 * (i.e. it is itself escaped, as in "\%").
 */
export function stripComments(text: string): string {
  const out = text.split('');
  let backslashRun = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      backslashRun++;
      continue;
    }
    if (ch === '%' && backslashRun % 2 === 0) {
      let j = i;
      while (j < text.length && text[j] !== '\n') {
        out[j] = ' ';
        j++;
      }
      backslashRun = 0;
      continue;
    }
    backslashRun = 0;
  }

  return out.join('');
}

/**
 * If \begin{document}...\end{document} is present, returns just that body
 * (same length as the slice, so no offset bookkeeping is needed by callers
 * that only care about counting). Otherwise returns the text unchanged.
 */
export function extractDocumentBody(text: string): string {
  const beginMatch = /\\begin\{document\}/.exec(text);
  if (!beginMatch) {
    return text;
  }
  const bodyStart = beginMatch.index + beginMatch[0].length;
  const endMatch = /\\end\{document\}/.exec(text);
  const bodyEnd = endMatch ? endMatch.index : text.length;
  return text.slice(bodyStart, bodyEnd);
}

/** Finds the index just after the '}' matching the '{' at openIndex. */
export function findMatchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++; // skip escaped char, it can't affect brace depth
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return text.length;
}

function blankRange(out: string[], start: number, end: number): void {
  for (let i = start; i < end; i++) {
    if (out[i] !== '\n') {
      out[i] = ' ';
    }
  }
}

/** Consumes and blanks a run of immediately-following [..]/{..} groups (with optional whitespace between them). */
function consumeAndBlankGroups(text: string, out: string[], start: number): number {
  let i = start;
  for (;;) {
    let j = i;
    while (text[j] === ' ' || text[j] === '\t') j++;
    if (text[j] === '[') {
      const close = text.indexOf(']', j);
      const end = close === -1 ? text.length : close + 1;
      blankRange(out, i, end);
      i = end;
      continue;
    }
    if (text[j] === '{') {
      const end = findMatchingBrace(text, j);
      blankRange(out, i, end);
      i = end;
      continue;
    }
    break;
  }
  return i;
}

function findMathEnd(text: string, from: number, closer: string): number {
  let i = from;
  while (i < text.length) {
    if (text.startsWith(closer, i)) {
      return i + closer.length;
    }
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    i++;
  }
  return text.length;
}

/**
 * The main pass: masks math and non-prose commands, and (based on options)
 * headings/captions/footnotes. Assumes comments and verbatim bodies have
 * already been blanked. Preserves line structure.
 */
export function maskNonProse(text: string, options: MaskOptions): string {
  const out = text.split('');
  const extraHeadingCommands = new Set(options.extraSectionCommands ?? []);
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (ch === '\\') {
      if (text[i + 1] === '\\') {
        blankRange(out, i, i + 2);
        i += 2;
        continue;
      }

      if ((text[i + 1] === '(' || text[i + 1] === '[') && !options.countMath) {
        const closer = text[i + 1] === '(' ? '\\)' : '\\]';
        const end = findMathEnd(text, i + 2, closer);
        blankRange(out, i, end);
        i = end;
        continue;
      }

      const cmdMatch = /^[a-zA-Z]+\*?/.exec(text.slice(i + 1));
      if (!cmdMatch) {
        // Escaped symbol, e.g. \%  \&  \_  \#  \{  \}  \(  \)  \[  \]. Keep
        // the literal character, drop only the backslash, and skip both so
        // the symbol is never re-interpreted (e.g. \$ must not start a math
        // span, and a lone \) is never treated as a delimiter).
        blankRange(out, i, i + 1);
        i += 2;
        continue;
      }

      const rawName = cmdMatch[0];
      const bareName = rawName.replace(/\*$/, '');
      const nameEnd = i + 1 + rawName.length;

      if (bareName === 'begin' || bareName === 'end') {
        let j = nameEnd;
        while (text[j] === ' ') j++;
        if (text[j] === '{') {
          const closeIdx = findMatchingBrace(text, j);
          const envName = text.slice(j + 1, closeIdx - 1);
          if (bareName === 'begin' && !options.countMath && MATH_ENV_NAMES.has(envName)) {
            const endTag = `\\end{${envName}}`;
            const endIdx = text.indexOf(endTag, closeIdx);
            const blankEnd = endIdx === -1 ? text.length : endIdx + endTag.length;
            blankRange(out, i, blankEnd);
            i = blankEnd;
            continue;
          }
          blankRange(out, i, closeIdx);
          i = closeIdx;
          continue;
        }
        blankRange(out, i, nameEnd);
        i = nameEnd;
        continue;
      }

      if (bareName === 'href') {
        // \href[options]{url}{display text}: drop the options and the URL,
        // but leave the display text (the second group) for the normal
        // prose-preserving path below to pick up untouched.
        let j = nameEnd;
        while (text[j] === ' ' || text[j] === '\t') j++;
        if (text[j] === '[') {
          const close = text.indexOf(']', j);
          const end = close === -1 ? text.length : close + 1;
          blankRange(out, j, end);
          j = end;
          while (text[j] === ' ' || text[j] === '\t') j++;
        }
        if (text[j] === '{') {
          const close = findMatchingBrace(text, j);
          blankRange(out, j, close); // URL argument: not prose
          j = close;
        }
        blankRange(out, i, nameEnd);
        i = j;
        continue;
      }

      const isHeading = HEADING_LEVELS.has(bareName) || extraHeadingCommands.has(bareName);
      const dropArgs =
        NON_PROSE_COMMANDS.has(bareName) ||
        (isHeading && !options.countHeadings) ||
        (bareName === 'caption' && !options.countCaptions) ||
        (bareName === 'footnote' && !options.countFootnotes);

      if (dropArgs) {
        const argsEnd = consumeAndBlankGroups(text, out, nameEnd);
        blankRange(out, i, nameEnd);
        i = argsEnd;
        continue;
      }

      // Prose-preserving command (\textbf, \emph, a countable \section,
      // \caption, \footnote, or anything unrecognized): drop only the
      // command name, keep its argument text in place.
      blankRange(out, i, nameEnd);
      i = nameEnd;
      continue;
    }

    if (!options.countMath && ch === '$') {
      const isDisplay = text[i + 1] === '$';
      const closer = isDisplay ? '$$' : '$';
      const end = findMathEnd(text, i + closer.length, closer);
      blankRange(out, i, end);
      i = end;
      continue;
    }

    i++;
  }

  return out.join('');
}
