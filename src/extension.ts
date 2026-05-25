import vscode from 'vscode';
import { errorPop } from './lib/native.js';
import registers from './registers.js';

export const activate = async (context: vscode.ExtensionContext) => {
  registers(context);
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const deactivate = () => {};
