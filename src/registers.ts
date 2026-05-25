import type { ConfigName, CommandName, Fn } from './types/global.js';
import { commands, workspace, ExtensionContext, ConfigurationChangeEvent } from 'vscode';
import { errorPop } from './lib/native.js';

const changed = (e: ConfigurationChangeEvent, ...names: ConfigName[]) =>
  names.some((name) => e.affectsConfiguration(`simple-launcher.${name}`));

const cmd = (c: CommandName, cb: Fn) => commands.registerCommand(`simple-launcher.${c}`, cb);

export default (context: ExtensionContext) => {
  context.subscriptions
    .push
    // * elements

    // * change events
    // workspace.onDidChangeConfiguration((e) => {
    // }),
    ();
};
