import * as vscode from 'vscode';
import { CountOptions } from './counter';
import { SectionOptions } from './sections';

export interface ExtensionConfig {
  countOptions: Omit<CountOptions, 'documentBodyOnly'>;
  sectionOptions: SectionOptions;
  showSection: boolean;
  showSelection: boolean;
}

export function readConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration('texWordCount');
  const extraSectionCommands = cfg.get<string[]>('extraSectionCommands', []);

  return {
    countOptions: {
      countMath: cfg.get<boolean>('countMath', false),
      countCaptions: cfg.get<boolean>('countCaptions', true),
      countFootnotes: cfg.get<boolean>('countFootnotes', true),
      countHeadings: cfg.get<boolean>('countHeadings', true),
      extraSectionCommands,
    },
    sectionOptions: {
      includeSubsections: cfg.get<boolean>('sectionIncludesSubsections', true),
      extraSectionCommands,
    },
    showSection: cfg.get<boolean>('showSection', true),
    showSelection: cfg.get<boolean>('showSelection', true),
  };
}
