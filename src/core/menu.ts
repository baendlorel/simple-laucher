import type { FullCommandName } from '@/types/global.js';
import vscode from 'vscode';
import { load } from '@/lib/config.js';
import { t } from '@/lib/l10n.js';
import { runCommandInTerminal } from './terminal.js';

export const marker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

marker.text = '$(debug-start) ' + t('status-bar.text');
marker.command = 'simple-launcher.menu' satisfies FullCommandName;
marker.show();

export const openMenu = async () => {
  const simpleLaunchCommands = await load();
  const getMonitorDescription = (monitorTarget: string | undefined) =>
    t('menu.monitoring', monitorTarget ?? t('menu.not-available'));

  if (simpleLaunchCommands.length === 0) {
    const action = await vscode.window.showQuickPick(
      [
        {
          action: 'import' as const,
          label: t('menu.empty.import'),
          description: t('menu.empty.import.description'),
        },
        {
          action: 'cancel' as const,
          label: t('menu.empty.cancel'),
        },
      ],
      {
        title: t('menu.empty.title'),
        placeHolder: t('menu.empty.placeholder'),
        ignoreFocusOut: true,
      },
    );
    if (action?.action === 'import') {
      await vscode.commands.executeCommand('simple-launcher.import-commands' satisfies FullCommandName);
    }
    return;
  }

  const result = await vscode.window.showQuickPick(
    [
      ...simpleLaunchCommands.map((item, i) => {
        if (item.displayName) {
          return {
            index: i,
            action: 'exec',
            label: item.displayName,
            detail: item.command,
            description: getMonitorDescription(item.monitorTarget),
          };
        }
        return {
          index: i,
          action: 'exec',
          label: item.command,
          description: getMonitorDescription(item.monitorTarget),
        };
      }),
      {
        index: NaN,
        action: 'config' as const,
        label: t('menu.config'),
        description: t('menu.config.description'),
      },
    ],
    {
      title: t('menu.title'),
    },
  );

  if (!result) {
    return;
  }

  if (result.action === 'config') {
    await vscode.commands.executeCommand('simple-launcher.config-panel' satisfies FullCommandName);
    return;
  }

  runCommandInTerminal(simpleLaunchCommands[result.index]);
};
