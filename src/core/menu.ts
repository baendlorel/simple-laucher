import type { FullCommandName } from '@/types/global.js';
import vscode from 'vscode';
import { load } from '@/lib/config.js';
import { t } from '@/lib/l10n.js';

export const marker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

marker.text = '$(debug-start) ' + t('status-bar.text');
marker.command = 'simple-launcher.menu' satisfies FullCommandName;
marker.show();

export const openMenu = async () => {
  const simpleLaunchCommands = await load();
  const result = await vscode.window.showQuickPick(
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
    {
      title: t('menu.title'),
    },
  );

  if (!result) {
    return;
  }

  const cmd = simpleLaunchCommands[result.index];
  vscode.window.showInformationMessage(`You selected: ${cmd.command}`);
};
