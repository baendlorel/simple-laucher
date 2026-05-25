import type { FullCommandName } from '@/types/global.js';
import vscode from 'vscode';
import { load } from '@/lib/config.js';

export const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

const MENU_CMD = 'simple-launcher.menu' satisfies FullCommandName;

statusBarItem.text = '$(debug-start) ';
statusBarItem.command = MENU_CMD;
statusBarItem.show();

export const vscodeCommand = vscode.commands.registerCommand(MENU_CMD, async () => {
  const simpleLaunchCommands = await load();
  const result = await vscode.window.showQuickPick(
    //   [
    //   { label: 'Option 1', description: 'Do something', detail: JSON.stringify(simpleLaunchCommands) },
    //   { label: 'Option 2', description: 'Do something else' },
    // ]
    simpleLaunchCommands.map((item, i) => {
      if (item.displayName) {
        return {
          index: i,
          label: item.displayName,
          description: item.command,
          detail: `Monitor target ${item.monitorTarget ?? 'N/A'}`,
        };
      }
      return {
        index: i,
        label: item.command,
        detail: `Monitor target ${item.monitorTarget ?? 'N/A'}`,
      };
    }),
  );

  if (!result) {
    return;
  }

  const cmd = simpleLaunchCommands[result.index];
  vscode.window.showInformationMessage(`You selected: ${cmd.command}`);
});
