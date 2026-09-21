import * as vscode from 'vscode';
import { countWords } from './counter';
import { sectionRange } from './sections';
import { readConfig, ExtensionConfig } from './config';
import { WordCountStatusBar } from './statusBar';

const LARGE_FILE_BYTES = 1_000_000;
const DOCUMENT_DEBOUNCE_MS = 300;
const SELECTION_DEBOUNCE_MS = 50;

function isLatex(document: vscode.TextDocument): boolean {
  return document.languageId === 'latex';
}

function isLarge(document: vscode.TextDocument): boolean {
  const lastLine = document.lineAt(document.lineCount - 1);
  return document.offsetAt(lastLine.range.end) > LARGE_FILE_BYTES;
}

/** Minimal surface exposed via the extension's exports, for integration tests only. */
export interface TexWordCountApi {
  getStatusBarText(): string;
  isStatusBarVisible(): boolean;
  refreshNow(): void;
}

export function activate(context: vscode.ExtensionContext): TexWordCountApi {
  const statusBar = new WordCountStatusBar();
  let config: ExtensionConfig = readConfig();

  // Total word count per document, keyed by document version, so cursor
  // and selection changes don't re-scan the whole file.
  const totalCache = new Map<string, { version: number; total: number }>();

  let documentTimer: ReturnType<typeof setTimeout> | undefined;
  let selectionTimer: ReturnType<typeof setTimeout> | undefined;

  function getTotal(document: vscode.TextDocument): number {
    const key = document.uri.toString();
    const cached = totalCache.get(key);
    if (cached && cached.version === document.version) {
      return cached.total;
    }
    const total = countWords(document.getText(), { ...config.countOptions, documentBodyOnly: true });
    totalCache.set(key, { version: document.version, total });
    return total;
  }

  function refresh(editor: vscode.TextEditor | undefined): void {
    if (!editor || !isLatex(editor.document)) {
      statusBar.hide();
      return;
    }

    const document = editor.document;
    const total = getTotal(document);

    let section: { count: number; title: string } | undefined;
    if (config.showSection) {
      const lines = document.getText().split('\n');
      const range = sectionRange(lines, editor.selection.active.line, config.sectionOptions);
      if (range) {
        const sectionText = lines.slice(range.startLine, range.endLine).join('\n');
        const count = countWords(sectionText, { ...config.countOptions, documentBodyOnly: false });
        section = { count, title: range.title };
      }
    }

    let selection: number | undefined;
    if (config.showSelection && !editor.selection.isEmpty) {
      selection = countWords(document.getText(editor.selection), {
        ...config.countOptions,
        documentBodyOnly: false,
      });
    }

    statusBar.update({ total, section, selection });
  }

  function scheduleDocumentUpdate(editor: vscode.TextEditor): void {
    // For very large files, skip live re-counting on every keystroke;
    // onDidSaveTextDocument below still refreshes them explicitly.
    if (isLarge(editor.document)) {
      return;
    }
    if (documentTimer) {
      clearTimeout(documentTimer);
    }
    documentTimer = setTimeout(() => refresh(editor), DOCUMENT_DEBOUNCE_MS);
  }

  function scheduleSelectionUpdate(editor: vscode.TextEditor): void {
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }
    selectionTimer = setTimeout(() => refresh(editor), SELECTION_DEBOUNCE_MS);
  }

  refresh(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.commands.registerCommand('texWordCount.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'texWordCount');
    }),

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      refresh(editor);
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        scheduleDocumentUpdate(editor);
      }
    }),

    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor === vscode.window.activeTextEditor) {
        scheduleSelectionUpdate(event.textEditor);
      }
    }),

    vscode.workspace.onDidSaveTextDocument((document) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document === document) {
        refresh(editor);
      }
    }),

    vscode.workspace.onDidCloseTextDocument((document) => {
      totalCache.delete(document.uri.toString());
    }),

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('texWordCount')) {
        config = readConfig();
        totalCache.clear();
        refresh(vscode.window.activeTextEditor);
      }
    }),

    statusBar,
    new vscode.Disposable(() => {
      if (documentTimer) clearTimeout(documentTimer);
      if (selectionTimer) clearTimeout(selectionTimer);
    }),
  );

  return {
    getStatusBarText: () => statusBar.getText(),
    isStatusBarVisible: () => statusBar.isVisible(),
    refreshNow: () => refresh(vscode.window.activeTextEditor),
  };
}

export function deactivate(): void {
  // Cleanup is handled via context.subscriptions disposables.
}
