import { describe, expect, it } from 'vitest';
import { findHeadings, sectionRange } from '../src/sections';

const DOC = [
  '\\documentclass{article}',      // 0
  '\\begin{document}',              // 1
  'Preamble-ish intro text.',       // 2
  '\\section{Introduction}',        // 3
  'Intro body text goes here.',     // 4
  '\\subsection{Background}',       // 5
  'Background text.',               // 6
  '\\subsection{Motivation}',       // 7
  'Motivation text.',               // 8
  '\\section{Methods}',             // 9
  'Methods body.',                  // 10
  '\\end{document}',                // 11
];

describe('findHeadings', () => {
  it('finds all headings with correct levels and lines', () => {
    const headings = findHeadings(DOC);
    expect(headings).toEqual([
      { line: 3, level: 2, title: 'Introduction' },
      { line: 5, level: 3, title: 'Background' },
      { line: 7, level: 3, title: 'Motivation' },
      { line: 9, level: 2, title: 'Methods' },
    ]);
  });

  it('ignores headings inside comments', () => {
    const lines = ['normal text', '% \\section{Fake}', 'more text'];
    expect(findHeadings(lines)).toEqual([]);
  });

  it('ignores headings inside verbatim blocks', () => {
    const lines = ['\\begin{verbatim}', '\\section{Not a real heading}', '\\end{verbatim}', '\\section{Real}'];
    expect(findHeadings(lines)).toEqual([{ line: 3, level: 2, title: 'Real' }]);
  });

  it('recognizes starred headings at the same level', () => {
    const lines = ['\\section*{Unnumbered}'];
    expect(findHeadings(lines)).toEqual([{ line: 0, level: 2, title: 'Unnumbered' }]);
  });

  it('recognizes extra section commands at the section level', () => {
    const lines = ['\\mysection{Custom}'];
    expect(findHeadings(lines, { includeSubsections: true, extraSectionCommands: ['mysection'] })).toEqual([
      { line: 0, level: 2, title: 'Custom' },
    ]);
  });
});

describe('sectionRange', () => {
  it('returns undefined before the first heading', () => {
    expect(sectionRange(DOC, 2, { includeSubsections: true })).toBeUndefined();
  });

  it('finds the enclosing top-level section, including subsections by default', () => {
    const range = sectionRange(DOC, 4, { includeSubsections: true });
    expect(range).toEqual({ startLine: 3, endLine: 9, level: 2, title: 'Introduction' });
  });

  it('stops at the next subsection when not including subsections', () => {
    const range = sectionRange(DOC, 4, { includeSubsections: false });
    expect(range).toEqual({ startLine: 3, endLine: 5, level: 2, title: 'Introduction' });
  });

  it('finds the enclosing subsection when the cursor is inside one', () => {
    const range = sectionRange(DOC, 6, { includeSubsections: true });
    expect(range).toEqual({ startLine: 5, endLine: 7, level: 3, title: 'Background' });
  });

  it('runs to the end of the document for the last section', () => {
    const range = sectionRange(DOC, 10, { includeSubsections: true });
    expect(range).toEqual({ startLine: 9, endLine: 12, level: 2, title: 'Methods' });
  });

  it('treats the heading line itself as inside the section', () => {
    const range = sectionRange(DOC, 3, { includeSubsections: true });
    expect(range?.startLine).toBe(3);
  });
});
