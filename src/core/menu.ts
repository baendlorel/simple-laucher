import type { FullCommandName } from '@/types/global.js';
import type { CommandConfig } from '@/types/index.js';
import vscode from 'vscode';
import { load, loadCurrentCommand } from '@/lib/config.js';
import { t } from '@/lib/l10n.js';
import { runCommandInTerminal } from './terminal.js';

const runCurrentCommandId = 'simple-launcher.run-current-command';
const launcherLabel = t('status-bar.text');

const getDisplayName = (command: CommandConfig) => command.displayName?.trim() || command.command;

const getCurrentCommandText = (command: CommandConfig, detail?: string) => {
  const suffix = detail ? `: ${detail}` : '';
  return `${getDisplayName(command)}${suffix}`;
};

const applyMarkerState = (currentCommand: CommandConfig | null) => {
  marker.text = currentCommand ? '$(debug-start)' : `$(debug-start) ${launcherLabel}`;
  marker.tooltip = launcherLabel;
};

const applyCurrentCommandState = (command: CommandConfig | null, detail?: string, canRun = false) => {
  if (!command) {
    currentCommandMarker.hide();
    currentCommandMarker.command = undefined;
    currentCommandMarker.tooltip = undefined;
    return;
  }

  currentCommandMarker.text = getCurrentCommandText(command, detail);
  currentCommandMarker.tooltip = detail ? `${getDisplayName(command)}: ${detail}` : getDisplayName(command);
  currentCommandMarker.command = canRun ? runCurrentCommandId : undefined;
  currentCommandMarker.show();
};

export const marker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1001);
export const currentCommandMarker = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);

marker.command = 'simple-launcher.menu' satisfies FullCommandName;

export const syncStatusBarFromConfig = async () => {
  const currentCommand = loadCurrentCommand();
  applyMarkerState(currentCommand);
  applyCurrentCommandState(currentCommand, undefined, currentCommand !== null);
};

export const setCurrentCommandStatus = (command: CommandConfig | null, detail?: string, canRun = false) => {
  applyMarkerState(command);
  applyCurrentCommandState(command, detail, canRun);
};

export const runCurrentCommand = async () => {
  const currentCommand = loadCurrentCommand();
  if (!currentCommand) {
    await syncStatusBarFromConfig();
    return;
  }

  await runCommandInTerminal(currentCommand);
};

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

  await runCommandInTerminal(simpleLaunchCommands[result.index]);
};

void syncStatusBarFromConfig();

export { runCurrentCommandId };
