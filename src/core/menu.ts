import type { FullCommandName } from '@/types/global.js';
import type { CommandConfig } from '@/types/index.js';
import vscode from 'vscode';
import { load } from '@/lib/config.js';
import { t } from '@/lib/l10n.js';
import { runCommandInTerminal } from './terminal.js';

export const marker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

marker.text = '$(debug-start)'; // + " " + t('status-bar.text');
marker.command = 'simple-launcher.menu' satisfies FullCommandName;
marker.show();

export const openMenu = async () => {
  const simpleLaunchCommands = await load();
  const monitorText = (item: CommandConfig) => {
    if (item.monitorTarget) {
      return `($(eye-watch) ${item.monitorTarget}) `;
    } else {
      return '';
    }
  };
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

  const items = simpleLaunchCommands.map((item, i) => {
    if (item.displayName) {
      return {
        index: i,
        action: 'exec',
        label: '$(debug-start) ' + item.displayName,
        description: monitorText(item) + item.command,
      };
    }
    return {
      index: i,
      action: 'exec',
      label: '$(debug-start) ' + item.command,
      description: monitorText(item),
    };
  });

  const result = await vscode.window.showQuickPick(
    [
      ...items,
      {
        index: NaN,
        action: 'config' as const,
        label: '$(gear) ' + t('menu.config'),
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
