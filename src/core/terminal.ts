import type { CommandConfig } from '@/types/index.js';
import vscode from 'vscode';
import { getMemoryUsage, type MemoryUsage } from 'mem-usage-ts';
import { marker } from './menu.js';

let terminal: vscode.Terminal | undefined;
let terminalCwd: string | undefined;
let replacingTerminal: vscode.Terminal | undefined;
let activeCommand: CommandConfig | undefined;
let monitorTimer: ReturnType<typeof setInterval> | undefined;

const getDisplayName = (command: CommandConfig) => command.displayName?.trim() || command.command;

const getMonitorIntervalMs = () => {
  const interval = vscode.workspace.getConfiguration('simple-launcher').get<number>('monitor-interval', 3);
  return Math.max(1, interval) * 1000;
};

const getWorkspaceCwd = (command: CommandConfig) => {
  if (!command.cwd) {
    return undefined;
  }

  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    return command.cwd;
  }

  return vscode.Uri.joinPath(root.uri, command.cwd).fsPath;
};

const getTerminal = (command: CommandConfig) => {
  const cwd = getWorkspaceCwd(command);
  if (terminal && terminalCwd !== cwd) {
    replacingTerminal = terminal;
    terminal.dispose();
    terminal = undefined;
    terminalCwd = undefined;
  }

  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'Simple Launcher',
      cwd,
    });
    terminalCwd = cwd;
  }

  return terminal;
};

const stopMonitor = () => {
  if (!monitorTimer) {
    return;
  }

  clearInterval(monitorTimer);
  monitorTimer = undefined;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) {
    return 'N/A';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const isMatch = (processName: string, monitorTarget: string) => {
  if (processName === monitorTarget) {
    return true;
  }
  try {
    return new RegExp(monitorTarget).test(processName);
  } catch {
    return false;
  }
};

const getMemoryUse = (item: MemoryUsage) => formatBytes(item.privateMemory ?? item.memory);

const updateMemoryStatus = async (command: CommandConfig) => {
  const monitorTarget = command.monitorTarget;
  if (!monitorTarget) {
    marker.text = getDisplayName(command);
    return;
  }

  const usage = getMemoryUsage();
  if (!usage) {
    marker.text = `${getDisplayName(command)}: N/A`;
    return;
  }

  const matched = usage.filter((item) => isMatch(item.processName, monitorTarget));
  if (matched.length === 1) {
    marker.text = `${command.displayName}: ${getMemoryUse(matched[0])}`;
    return;
  }

  const total = matched.reduce((sum, item) => sum + (item.privateMemory ?? item.memory), 0);
  const suffix = matched.length > 1 ? `(${matched.length} matched)` : '';
  marker.text = `${getDisplayName(command)}: ${formatBytes(total)}${suffix}`;
};

const startMonitor = (command: CommandConfig) => {
  stopMonitor();

  if (!command.monitorTarget) {
    marker.text = getDisplayName(command);
    return;
  }

  void updateMemoryStatus(command);
  monitorTimer = setInterval(() => {
    if (activeCommand !== command) {
      stopMonitor();
      return;
    }

    void updateMemoryStatus(command);
  }, getMonitorIntervalMs());
};

export const runCommandInTerminal = (command: CommandConfig) => {
  activeCommand = command;
  const runningTerminal = getTerminal(command);
  runningTerminal.show(false);
  runningTerminal.sendText(command.command, true);
  startMonitor(command);
};

export const registerTerminal = (closedTerminal: vscode.Terminal) => {
  if (closedTerminal === replacingTerminal) {
    replacingTerminal = undefined;
    return;
  }

  if (closedTerminal !== terminal) {
    return;
  }

  terminal = undefined;
  terminalCwd = undefined;
  stopMonitor();
  if (activeCommand) {
    marker.text = `${getDisplayName(activeCommand)}: terminated`;
  }
};
