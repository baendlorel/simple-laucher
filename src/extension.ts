import vscode from 'vscode';
import { marker, openMenu } from './core/menu.js';
import { registerTerminal } from './core/terminal.js';
import { openPanel } from './lib/config.js';

export const activate = async (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    marker,
    vscode.window.onDidCloseTerminal(registerTerminal),
    vscode.commands.registerCommand('simple-launcher.menu', openMenu),
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
