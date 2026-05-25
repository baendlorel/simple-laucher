import vscode from 'vscode';
import registers from './registers.js';

export const activate = async (context: vscode.ExtensionContext) => {
  registers(context);
  vscode.window.showInformationMessage('Simple Launcher activated!');
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const deactivate = () => {};
