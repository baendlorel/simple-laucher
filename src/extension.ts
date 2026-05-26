import vscode from 'vscode';
import {
  currentCommandMarker,
  marker,
  openMenu,
  runCurrentCommand,
  runCurrentCommandId,
  syncStatusBarFromConfig,
} from './core/menu.js';
import { registerTaskEnd, registerTaskProcessEnd } from './core/terminal.js';
import { openPanel } from './lib/config.js';

export const activate = async (context: vscode.ExtensionContext) => {
  await syncStatusBarFromConfig();

  context.subscriptions.push(
    marker,
    currentCommandMarker,
    vscode.tasks.onDidEndTask(registerTaskEnd),
    vscode.tasks.onDidEndTaskProcess(registerTaskProcessEnd),
    vscode.commands.registerCommand('simple-launcher.menu', openMenu),
    vscode.commands.registerCommand(runCurrentCommandId, runCurrentCommand),
    vscode.commands.registerCommand('simple-launcher.import-commands', () =>
      openPanel(context, 'simple-launcher.import-commands'),
    ),
    vscode.commands.registerCommand('simple-launcher.config-panel', () =>
      openPanel(context, 'simple-launcher.config-panel'),
    ),
  );
  if (__IS_DEV__) {
    vscode.window.showInformationMessage('Simple Launcher activated!');
  }
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const deactivate = () => {};
