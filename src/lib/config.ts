import vscode from 'vscode';

const uniqueKey = vscode.env.machineId;
export const config = () => vscode.workspace.getConfiguration('simple-launcher');

export const getCommands = () => {
  const commands = config().get<string[]>('commands') || [];
};
