import * as assert from 'assert';
import * as vscode from 'vscode';
import { TexWordCountApi } from '../../../src/extension';

const EXTENSION_ID = 'leevikopakkala.latex-word-count-statusbar';

async function activateExtension(): Promise<TexWordCountApi> {
  const ext = vscode.extensions.getExtension<TexWordCountApi>(EXTENSION_ID);
  assert.ok(ext, `extension ${EXTENSION_ID} should be discoverable`);
  const api = await ext!.activate();
  assert.ok(api, 'activate() should return the test API');
  return api;
}

suite('TeX Word Count status bar', () => {
  test('shows the total word count for a LaTeX document', async () => {
    const api = await activateExtension();

    const doc = await vscode.workspace.openTextDocument({
      language: 'latex',
      content: '\\documentclass{article}\n\\begin{document}\nHello world, this is a test.\n\\end{document}\n',
    });
    await vscode.window.showTextDocument(doc);
    api.refreshNow();

    assert.match(api.getStatusBarText(), /^Total words: 6\b/);
  });

  test('shows the section count when the cursor is inside a section', async () => {
    const api = await activateExtension();

    const doc = await vscode.workspace.openTextDocument({
      language: 'latex',
      content:
        '\\begin{document}\n' +
        '\\section{Introduction}\n' +
        'one two three four\n' +
        '\\section{Conclusion}\n' +
        'five six\n' +
        '\\end{document}\n',
    });
    const editor = await vscode.window.showTextDocument(doc);
    const introLine = doc.getText().split('\n').indexOf('one two three four');
    editor.selection = new vscode.Selection(introLine, 0, introLine, 0);
    api.refreshNow();

    const text = api.getStatusBarText();
    assert.match(text, /Section: 5\b/, `expected a section count of 5, got "${text}"`);
  });

  test('shows the selection count when text is selected', async () => {
    const api = await activateExtension();

    const doc = await vscode.workspace.openTextDocument({
      language: 'latex',
      content: '\\begin{document}\none two three four five\n\\end{document}\n',
    });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 0, 1, 'one two three'.length);
    api.refreshNow();

    const text = api.getStatusBarText();
    assert.match(text, /Selected: 3\b/, `expected a selection count of 3, got "${text}"`);
  });

  test('hides the item for non-LaTeX documents', async () => {
    const api = await activateExtension();

    const latexDoc = await vscode.workspace.openTextDocument({ language: 'latex', content: 'word' });
    await vscode.window.showTextDocument(latexDoc);
    api.refreshNow();
    assert.strictEqual(api.isStatusBarVisible(), true);

    const plainDoc = await vscode.workspace.openTextDocument({ language: 'plaintext', content: 'not latex' });
    await vscode.window.showTextDocument(plainDoc);
    api.refreshNow();
    assert.strictEqual(api.isStatusBarVisible(), false);
  });
});
