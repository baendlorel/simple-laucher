import vscode from 'vscode';
import { inspect } from 'node:util';

export const $info = vscode.window.showInformationMessage;
export const $err = vscode.window.showErrorMessage;
export const errorPop = (err: Error) => $err(inspect(err));

const textDecoder = new TextDecoder();
export const readFileText = async (uri: vscode.Uri): Promise<string | null> => {
  try {
    const t = await vscode.workspace.fs.readFile(uri);
    return textDecoder.decode(t);
  } catch {
    return null;
  }
};
