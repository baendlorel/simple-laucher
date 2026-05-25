import vscode from 'vscode';
import { marker, openMenu } from './core/menu.js';
import { openImportCommandsPanel } from './lib/config.js';

export default (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    marker,
    vscode.commands.registerCommand('simple-launcher.menu', openMenu),
    vscode.commands.registerCommand('simple-launcher.menu', () => openImportCommandsPanel(context)),
  );
};
