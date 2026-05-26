import type { CommandConfig } from '@/types/index.js';
import vscode from 'vscode';
import { getMemoryUsage, type MemoryUsage } from 'mem-usage-ts';
import { marker } from './menu.js';

let activeCommand: CommandConfig | undefined;
let activeExecution: vscode.TaskExecution | undefined;
let activeRunId = 0;
let monitorTimer: ReturnType<typeof setInterval> | undefined;

const taskSource = 'Simple Launcher';

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

const getStatusText = (command: CommandConfig, detail?: string) => {
  const suffix = detail ? `: ${detail}` : '';
  return `$(debug-start) ${getDisplayName(command)}${suffix}`;
};

const setMarkerStatus = (command: CommandConfig, detail?: string) => {
  const displayName = getDisplayName(command);
  marker.text = getStatusText(command, detail);
  marker.tooltip = detail ? `${displayName}: ${detail}` : displayName;
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

const updateMemoryStatus = async (command: CommandConfig) => {
  const monitorTarget = command.monitorTarget;
  if (!monitorTarget) {
    setMarkerStatus(command);
    return;
  }

  const usage = getMemoryUsage();
  if (!usage) {
    setMarkerStatus(command, 'N/A');
    return;
  }

  const matched = usage.filter((item) => isMatch(item.processName, monitorTarget));
  if (matched.length === 0) {
    setMarkerStatus(command, 'N/A');
    return;
  }

  if (matched.length === 1) {
    setMarkerStatus(command, formatBytes(matched[0].memory));
    return;
  }

  const total = matched.reduce((sum, item) => sum + item.memory, 0);
  setMarkerStatus(command, `${formatBytes(total)} (${matched.length} matched)`);
};

const updateMemoryStatusSafe = async (command: CommandConfig, runId: number) => {
  if (activeRunId !== runId) {
    return;
  }

  try {
    await updateMemoryStatus(command);
  } catch (error) {
    if (activeRunId !== runId) {
      return;
    }

    console.error('Simple Launcher memory monitor failed', error);
    setMarkerStatus(command, 'N/A');
  }
};

const startMonitor = (command: CommandConfig, runId: number) => {
  stopMonitor();

  if (!command.monitorTarget) {
    setMarkerStatus(command);
    return;
  }

  void updateMemoryStatusSafe(command, runId);
  monitorTimer = setInterval(() => {
    if (activeRunId !== runId) {
      stopMonitor();
      return;
    }

    void updateMemoryStatusSafe(command, runId);
  }, getMonitorIntervalMs());
};

const createTask = (command: CommandConfig) => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const scope = workspaceFolder ?? vscode.TaskScope.Workspace;
  const cwd = getWorkspaceCwd(command);
  const displayName = getDisplayName(command);
  const task = new vscode.Task(
    {
      type: 'simple-launcher',
      command: command.command,
      displayName,
      cwd: command.cwd,
    },
    scope,
    displayName,
    taskSource,
    new vscode.ShellExecution(command.command, { cwd }),
    [],
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    focus: false,
    panel: vscode.TaskPanelKind.Shared,
    showReuseMessage: false,
    clear: false,
  };

  return task;
};

const finishExecution = (execution: vscode.TaskExecution, detail: string) => {
  if (execution !== activeExecution) {
    return;
  }

  stopMonitor();
  activeRunId += 1;
  activeExecution = undefined;

  if (activeCommand) {
    setMarkerStatus(activeCommand, detail);
  }
};

export const runCommandInTerminal = async (command: CommandConfig) => {
  stopMonitor();
  activeRunId += 1;
  const runId = activeRunId;
  activeCommand = command;
  activeExecution = undefined;
  setMarkerStatus(command, command.monitorTarget ? 'starting' : undefined);
  startMonitor(command, runId);

  try {
    const execution = await vscode.tasks.executeTask(createTask(command));
    if (activeRunId !== runId) {
      return;
    }
    activeExecution = execution;
  } catch (error) {
    if (activeRunId !== runId) {
      return;
    }
    activeCommand = undefined;
    activeRunId += 1;
    stopMonitor();
    setMarkerStatus(command, 'failed to start');
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Simple Launcher failed to start "${getDisplayName(command)}": ${message}`);
  }
};

export const registerTaskEnd = (event: { execution: vscode.TaskExecution }) => {
  finishExecution(event.execution, 'terminated');
};

export const registerTaskProcessEnd = (event: { execution: vscode.TaskExecution; exitCode: number | undefined }) => {
  if (event.exitCode === 0) {
    finishExecution(event.execution, 'exited');
    return;
  }

  if (event.exitCode === undefined) {
    finishExecution(event.execution, 'terminated');
    return;
  }

  finishExecution(event.execution, `exited ${event.exitCode}`);
};
