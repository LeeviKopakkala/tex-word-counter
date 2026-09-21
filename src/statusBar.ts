import * as vscode from 'vscode';

export interface StatusBarData {
  total: number;
  section?: { count: number; title: string };
  selection?: number;
}

const DOT = '·';

export class WordCountStatusBar {
  private readonly item: vscode.StatusBarItem;
  private visible = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.name = 'TeX Word Count';
    this.item.command = 'texWordCount.openSettings';
  }

  update(data: StatusBarData): void {
    const parts = [`Total words: ${data.total.toLocaleString()}`];
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**Total words:** ${data.total.toLocaleString()}\n\n`);

    if (data.section) {
      parts.push(`Section: ${data.section.count.toLocaleString()}`);
      const title = data.section.title || '(untitled)';
      tooltip.appendMarkdown(`**Section "${title}":** ${data.section.count.toLocaleString()} words\n\n`);
    }

    if (data.selection !== undefined) {
      parts.push(`Selected: ${data.selection.toLocaleString()}`);
      tooltip.appendMarkdown(`**Selected:** ${data.selection.toLocaleString()} words\n\n`);
    }

    tooltip.appendMarkdown('Click to open TeX Word Count settings.');

    this.item.text = parts.join(` ${DOT} `);
    this.item.tooltip = tooltip;
    this.item.show();
    this.visible = true;
  }

  hide(): void {
    this.item.hide();
    this.visible = false;
  }

  /** The rendered status bar text, e.g. for integration tests. */
  getText(): string {
    return typeof this.item.text === 'string' ? this.item.text : '';
  }

  isVisible(): boolean {
    // vscode.StatusBarItem doesn't expose visibility directly; we track it
    // by mirroring show()/hide() calls through update()/hide() above.
    return this.visible;
  }

  dispose(): void {
    this.item.dispose();
  }
}
