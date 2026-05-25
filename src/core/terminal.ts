import type { CommandConfig } from '@/types/index.js';
import vscode from 'vscode';
import { marker } from './menu.js';

let terminal: vscode.Terminal | undefined;
let terminalCwd: string | undefined;
let replacingTerminal: vscode.Terminal | undefined;
let activeCommand: CommandConfig | undefined;
let monitorTimer: ReturnType<typeof setInterval> | undefined;

interface MemoryUsageInfo {
  name?: string;
  processName?: string;
  command?: string;
  memoryUsage?: number | string;
  memory?: number | string;
  rss?: number | string;
}

interface MemoryUsageModule {
  getMemoryUsage: () => MemoryUsageInfo[] | Promise<MemoryUsageInfo[]>;
}

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

const getProcessName = (item: MemoryUsageInfo) => item.processName ?? item.name ?? item.command ?? '';

const getRawMemoryValue = (item: MemoryUsageInfo) => item.memoryUsage ?? item.memory ?? item.rss ?? 0;

const parseMemoryValue = (value: number | string) => {
  if (typeof value === 'number') {
    return value;
  }

  const match = value.trim().match(/^([\d.]+)\s*([kmgt]?b?)?$/i);
  if (!match) {
    return Number.parseFloat(value);
  }

  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  const multipliers: Record<string, number> = {
    b: 1,
    k: 1024,
    kb: 1024,
    m: 1024 ** 2,
    mb: 1024 ** 2,
    g: 1024 ** 3,
    gb: 1024 ** 3,
    t: 1024 ** 4,
    tb: 1024 ** 4,
  };

  return amount * (multipliers[unit] ?? 1);
};

const getMemoryValue = (item: MemoryUsageInfo) => parseMemoryValue(getRawMemoryValue(item));

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

const loadMemoryUsageModule = async () => {
  try {
    return (await import('mem-use-ts')) as MemoryUsageModule;
  } catch {
    return null;
  }
};

const updateMemoryStatus = async (command: CommandConfig) => {
  if (!command.monitorTarget) {
    marker.text = getDisplayName(command);
    return;
  }

  const memoryUsageModule = await loadMemoryUsageModule();
  if (!memoryUsageModule) {
    marker.text = `${getDisplayName(command)}: N/A`;
    return;
  }

  const processes = await memoryUsageModule.getMemoryUsage();
  const matchedProcesses = processes.filter((item) => isMatch(getProcessName(item), command.monitorTarget || ''));
  if (matchedProcesses.length === 1) {
    marker.text = `${getDisplayName(command)}: ${String(getRawMemoryValue(matchedProcesses[0]))}`;
    return;
  }

  const totalMemory = matchedProcesses.reduce((sum, item) => sum + getMemoryValue(item), 0);
  const suffix = matchedProcesses.length > 1 ? `(${matchedProcesses.length} matched)` : '';
  marker.text = `${getDisplayName(command)}: ${formatBytes(totalMemory)}${suffix}`;
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

export const registerTerminal = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((closedTerminal) => {
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
    }),
  );
};
