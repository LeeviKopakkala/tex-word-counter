// Pure word-counting pipeline for LaTeX source. No vscode import.
import { blankVerbatimEnvironments, extractDocumentBody, maskNonProse, stripComments, MaskOptions } from './latex';

export interface CountOptions extends MaskOptions {
  /**
   * When true, only text between \begin{document} and \end{document} is
   * counted (if that pair is present). Section/selection counts should
   * pass false, since they operate on an already-extracted line range.
   */
  documentBodyOnly: boolean;
}

export const DEFAULT_COUNT_OPTIONS: CountOptions = {
  countMath: false,
  countCaptions: true,
  countFootnotes: true,
  countHeadings: true,
  extraSectionCommands: [],
  documentBodyOnly: true,
};

// A token counts as a word if it contains at least one Unicode letter or digit.
const WORD_RE = /[\p{L}\p{N}]+(?:[\p{L}\p{N}''-]*[\p{L}\p{N}])?/gu;

/** Counts prose words in a chunk of LaTeX source according to options. */
export function countWords(text: string, options: CountOptions = DEFAULT_COUNT_OPTIONS): number {
  let body = blankVerbatimEnvironments(text);
  body = stripComments(body);
  if (options.documentBodyOnly) {
    body = extractDocumentBody(body);
  }
  const masked = maskNonProse(body, options);
  const matches = masked.match(WORD_RE);
  return matches ? matches.length : 0;
}
