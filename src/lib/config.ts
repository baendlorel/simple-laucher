import type { CommandConfig, LoadFrom } from '@/types/index.js';
import vscode from 'vscode';
import { parse } from 'smol-toml';

const config = () => vscode.workspace.getConfiguration('simple-launcher');

const loadFromPackageJson = async (root: vscode.WorkspaceFolder | undefined) => {
  if (!root) {
    return [];
  }

  const content = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root.uri, 'package.json'));
  const data = JSON.parse(content.toString()) as { scripts?: Record<string, string> };
  if (!data.scripts) {
    return [];
  }

  return Object.entries(data.scripts).map(
    ([key, value]): CommandConfig => ({
      displayName: key,
      command: value,
      from: 'package.json',
    }),
  );
};

const loadFromCargoToml = async (root: vscode.WorkspaceFolder | undefined) => {
  if (!root) {
    return [];
  }

  const content = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root.uri, 'Cargo.toml'));
  const data = parse(content.toString()) as { package: { name: string }; workspace?: { members?: string[] } };
  const members = data.workspace?.members;
  if (!Array.isArray(members)) {
    // Only root command
    return [
      {
        displayName: data.package.name,
        command: `cargo run`,
        from: 'Cargo.toml',
      } satisfies CommandConfig,
    ];
  }

  const cargoTomlPaths = members.map((member) => vscode.Uri.joinPath(root.uri, member, 'Cargo.toml'));
  const cargoTomlContents = await Promise.all(
    cargoTomlPaths.map((path) => vscode.workspace.fs.readFile(path).then((content) => content.toString())),
  );

  return cargoTomlContents
    .map((content) => parse(content) as { package?: { name?: string } })
    .filter((data): data is { package: { name: string } } => Boolean(data.package?.name))
    .map(
      (data): CommandConfig => ({
        displayName: data.package!.name,
        command: `cargo run --bin ${data.package!.name}`,
        from: 'Cargo.toml',
      }),
    );
};

export const load = async () => {
  const loadFrom = config().get<LoadFrom[]>('load-from', []);
  vscode.window.showInformationMessage(`Loading commands from: ${typeof loadFrom} ${Array.isArray(loadFrom)}`);

  const commands = config().get<CommandConfig[]>('custom-commands', []);
  if (loadFrom.includes('package.json')) {
    const arr = await loadFromPackageJson(vscode.workspace.workspaceFolders?.[0]);
    commands.push(...arr);
  }

  if (loadFrom.includes('Cargo.toml')) {
    const arr = await loadFromCargoToml(vscode.workspace.workspaceFolders?.[0]);
    commands.push(...arr);
  }

  return commands;
};

export const save = (commands: CommandConfig[], configurationTarget = vscode.ConfigurationTarget.Workspace) => {
  return config().update('custom-commands', commands, configurationTarget);
};
