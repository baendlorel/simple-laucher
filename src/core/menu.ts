import type { FullCommandName } from '@/types/global.js';
import vscode from 'vscode';
import { load } from '@/lib/config.js';
import { t } from '@/lib/l10n.js';

export const marker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

marker.text = '$(debug-start) ' + t('status-bar.text');
marker.command = 'simple-launcher.menu' satisfies FullCommandName;
marker.show();

export const openMenu = async (context: vscode.ExtensionContext) => {
  const simpleLaunchCommands = await load();
  if (simpleLaunchCommands.length === 0) {
    const shouldImport = await vscode.window.showQuickPick([{ label: '是' }, { label: '否，我要手动编辑' }], {
      title: '工作区还没有配置命令集，是否导入？（支持package.json和Cargo.toml）',
    });
    if (shouldImport?.label === '是') {
      await vscode.commands.executeCommand('simple-launcher.import-commands');
    }
    return;
  }

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
