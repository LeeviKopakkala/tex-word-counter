import { describe, expect, it } from 'vitest';
import { countWords, DEFAULT_COUNT_OPTIONS, CountOptions } from '../src/counter';

function count(text: string, overrides: Partial<CountOptions> = {}): number {
  return countWords(text, { ...DEFAULT_COUNT_OPTIONS, documentBodyOnly: false, ...overrides });
}

describe('countWords', () => {
  it('counts plain prose', () => {
    expect(count('one two three')).toBe(3);
  });

  it('ignores extra whitespace and punctuation', () => {
    expect(count('one,  two.  three!\n\nfour?')).toBe(4);
  });

  it('strips line comments', () => {
    expect(count('one two % three four\nfive')).toBe(3);
  });

  it('treats an escaped percent as a literal character, not a comment', () => {
    expect(count('one 100\\% two')).toBe(3);
  });

  it('strips inline math by default', () => {
    expect(count('before $x + y = z$ after')).toBe(2);
  });

  it('counts inline math when countMath is enabled', () => {
    expect(count('before $x$ after', { countMath: true })).toBeGreaterThanOrEqual(3);
  });

  it('strips \\(...\\) and \\[...\\] math', () => {
    expect(count('a \\(x^2\\) b \\[y^2\\] c')).toBe(3);
  });

  it('strips $$...$$ display math', () => {
    expect(count('before $$ x + y $$ after')).toBe(2);
  });

  it('strips math environments', () => {
    const text = 'before\n\\begin{align}\n  x &= y \\\\\n  z &= w\n\\end{align}\nafter';
    expect(count(text)).toBe(2);
  });

  it('strips verbatim-like environments entirely', () => {
    const text = 'before\n\\begin{verbatim}\nthis % is not a comment $x$\n\\end{verbatim}\nafter';
    expect(count(text)).toBe(2);
  });

  it('strips lstlisting bodies', () => {
    const text = 'before\n\\begin{lstlisting}[language=Python]\nprint("hello world")\n\\end{lstlisting}\nafter';
    expect(count(text)).toBe(2);
  });

  it('drops citation keys but keeps surrounding prose', () => {
    expect(count('see \\cite{smith2020} for details')).toBe(3);
  });

  it('drops ref/label targets', () => {
    expect(count('as shown in \\ref{fig:one} and \\label{sec:two}')).toBe(4);
  });

  it('drops \\usepackage and \\includegraphics arguments', () => {
    expect(count('\\usepackage[utf8]{inputenc}\n\\includegraphics[width=\\linewidth]{img.png}\nword')).toBe(1);
  });

  it('keeps the text argument of formatting commands', () => {
    expect(count('this is \\textbf{very} important and \\emph{quite} clear')).toBe(7);
  });

  it('handles nested formatting commands', () => {
    expect(count('\\textbf{bold \\emph{and italic} text}')).toBe(4);
  });

  it('counts heading text by default', () => {
    expect(count('\\section{Introduction}\nSome text.')).toBe(3);
  });

  it('excludes heading text when countHeadings is false', () => {
    expect(count('\\section{Introduction}\nSome text.', { countHeadings: false })).toBe(2);
  });

  it('excludes captions when countCaptions is false', () => {
    const text = '\\begin{figure}\n\\caption{A nice picture of a cat}\n\\end{figure}\nbody text';
    expect(count(text, { countCaptions: false })).toBe(2);
  });

  it('includes captions by default', () => {
    const text = '\\caption{A nice picture}';
    expect(count(text)).toBe(3);
  });

  it('excludes footnotes when countFootnotes is false', () => {
    expect(count('word\\footnote{a whole aside here}', { countFootnotes: false })).toBe(1);
  });

  it('keeps the visible text of \\href but drops the URL', () => {
    expect(count('see \\href{https://example.com/page}{our website} for more')).toBe(5);
  });

  it('only counts between \\begin{document} and \\end{document} when present', () => {
    const text = '\\documentclass{article}\n\\usepackage{lipsum}\n\\begin{document}\nreal content here\n\\end{document}';
    expect(count(text, { documentBodyOnly: true })).toBe(3);
  });

  it('counts everything when there is no \\begin{document}', () => {
    expect(count('just a fragment of words', { documentBodyOnly: true })).toBe(5);
  });

  it('counts unicode words', () => {
    expect(count('caf\u00e9 na\u00efve r\u00e9sum\u00e9')).toBe(3);
  });

  it('counts digits as words', () => {
    expect(count('chapter 42 begins')).toBe(3);
  });

  it('handles an empty document', () => {
    expect(count('')).toBe(0);
  });

  it('handles a comment-only document', () => {
    expect(count('% just a comment\n% and another')).toBe(0);
  });
});
