import vscode from 'vscode';
import { marker, openMenu } from './core/menu.js';
import { registerTerminal } from './core/terminal.js';
import { openConfigCommandsPanel, openImportCommands } from './lib/config.js';

export default (context: vscode.ExtensionContext) => {
  registerTerminal(context);

  context.subscriptions.push(
    marker,
    vscode.commands.registerCommand('simple-launcher.menu', openMenu),
    vscode.commands.registerCommand('simple-launcher.import-commands', () => openImportCommands(context)),
    vscode.commands.registerCommand('simple-launcher.config-panel', () => openConfigCommandsPanel(context)),
  );
};
