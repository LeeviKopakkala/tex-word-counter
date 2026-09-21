// Pure section/heading detection for LaTeX source. No vscode import.
import { blankVerbatimEnvironments, findMatchingBrace, HEADING_LEVELS, stripComments } from './latex';

export interface Heading {
  line: number;
  level: number;
  title: string;
}

export interface SectionOptions {
  includeSubsections: boolean;
  extraSectionCommands?: readonly string[];
}

export interface SectionRange {
  /** 0-indexed, inclusive: the line the heading itself is on. */
  startLine: number;
  /** 0-indexed, exclusive: the first line no longer part of this section (or the line count, if the section runs to the end). */
  endLine: number;
  level: number;
  title: string;
}

const HEADING_RE = /\\([a-zA-Z]+)(\*)?[ \t]*(?:\[[^\]\n]*\])?[ \t]*\{/g;

/**
 * Finds every heading command in the document, in a version of the text
 * with comments and verbatim-like bodies blanked out first, so a "\section"
 * written inside a comment or a code listing is never mistaken for a real
 * heading. Line numbers refer to the original document.
 */
export function findHeadings(lines: readonly string[], options: SectionOptions = { includeSubsections: true }): Heading[] {
  const text = lines.join('\n');
  const safe = stripComments(blankVerbatimEnvironments(text));
  const extra = new Set(options.extraSectionCommands ?? []);

  const headings: Heading[] = [];
  let match: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;
  while ((match = HEADING_RE.exec(safe))) {
    const name = match[1];
    let level = HEADING_LEVELS.get(name);
    if (level === undefined && extra.has(name)) {
      level = HEADING_LEVELS.get('section');
    }
    if (level === undefined) {
      continue;
    }
    const braceOpen = match.index + match[0].length - 1;
    const braceClose = findMatchingBrace(safe, braceOpen);
    const title = safe.slice(braceOpen + 1, braceClose - 1).trim();
    const line = countNewlinesBefore(safe, match.index);
    headings.push({ line, level, title });
    HEADING_RE.lastIndex = braceClose;
  }

  return headings;
}

function countNewlinesBefore(text: string, index: number): number {
  let count = 0;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') count++;
  }
  return count;
}

/**
 * Returns the section containing `cursorLine` (0-indexed), or undefined if
 * the cursor is before the first heading (e.g. in the preamble, or a
 * document with no headings at all).
 */
export function sectionRange(
  lines: readonly string[],
  cursorLine: number,
  options: SectionOptions,
): SectionRange | undefined {
  const headings = findHeadings(lines, options);
  let currentIndex = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].line <= cursorLine) {
      currentIndex = i;
    } else {
      break;
    }
  }
  if (currentIndex === -1) {
    return undefined;
  }

  const current = headings[currentIndex];
  let endLine = lines.length;
  for (let i = currentIndex + 1; i < headings.length; i++) {
    const candidate = headings[i];
    const stopsHere = options.includeSubsections ? candidate.level <= current.level : true;
    if (stopsHere) {
      endLine = candidate.line;
      break;
    }
  }

  return {
    startLine: current.line,
    endLine,
    level: current.level,
    title: current.title,
  };
}
