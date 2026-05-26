import vscode from 'vscode';
import { inspect } from 'node:util';

export const $info = vscode.window.showInformationMessage;
export const $err = vscode.window.showErrorMessage;

/**
 * Returns a `null` value after showing the error message, so it can be used in `await` expressions without needing to explicitly return `null`.
 */
export const errPop = (err: Error) => ($err(inspect(err)), null);

const textDecoder = new TextDecoder();
export const readFileText = async (uri: vscode.Uri): Promise<string | null> => {
  try {
    const t = await vscode.workspace.fs.readFile(uri);
    return textDecoder.decode(t);
  } catch {
    return null;
  }
};
