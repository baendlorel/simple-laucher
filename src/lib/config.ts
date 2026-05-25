import type { CommandConfig, LoadFrom } from '@/types/index.js';
import vscode from 'vscode';

export const config = () => vscode.workspace.getConfiguration('simple-launcher');

export const load = () => {
  const loadFrom = new Set(config().get<LoadFrom[]>('load-from', []));
  const custom = config().get<CommandConfig[]>('custom-commands', []);
};

export const save = (commands: CommandConfig[], configurationTarget = vscode.ConfigurationTarget.Workspace) => {
  return config().update('custom-commands', commands, configurationTarget);
};
