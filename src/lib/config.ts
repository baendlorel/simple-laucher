import type { CommandConfig, ImportCommandCandidate, ImportSource, ImportSourceGroup } from '@/types/index.js';
import vscode from 'vscode';
import path from 'node:path';
import { parse } from 'smol-toml';

import configPanelTemplate from '@/template/config-panel.html?raw';
import { t } from './l10n.js';
import { readFileText } from './native.js';

const config = () => vscode.workspace.getConfiguration('simple-launcher');

const joinUri = (root: vscode.WorkspaceFolder, uri: vscode.Uri) => path.join(root.uri.path, uri.path);

const createCandidateId = (source: ImportSource, sourceFile: string, displayName: string, command: string) =>
  `${source}:${sourceFile}:${displayName}:${command}`;

const findPackageJsonFiles = async (root: vscode.WorkspaceFolder) =>
  vscode.workspace.findFiles(
    new vscode.RelativePattern(root, '**/package.json'),
    new vscode.RelativePattern(root, '**/{.git,.hg,.svn,.vscode,.vscode-test,node_modules,out,dist,build,coverage}/**'),
  );

type CandidateGetter = (root: vscode.WorkspaceFolder | null) => Promise<ImportCommandCandidate[]>;

const getPackageJsonCandidates: CandidateGetter = async (root) => {
  if (!root) {
    return [];
  }

  const packageJsons = await findPackageJsonFiles(root);
  const result = await Promise.all(
    packageJsons.map(async (uri) => {
      const content = await readFileText(uri);
      if (!content) {
        return [];
      }

      const data = JSON.parse(content) as { name?: string; scripts?: Record<string, string> };
      const sourceFile = joinUri(root, uri);
      const packageDir = path.dirname(sourceFile);
      const isRootPackage = sourceFile === 'package.json';
      const displayPrefix = data.name ?? packageDir;

      return Object.entries(data.scripts ?? {}).map(
        ([key, value]): ImportCommandCandidate => ({
          id: createCandidateId('package.json', sourceFile, isRootPackage ? key : `${displayPrefix}:${key}`, value),
          displayName: isRootPackage ? key : `${displayPrefix}:${key}`,
          command: value,
          cwd: packageDir,
          from: 'package.json',
          sourceFile,
        }),
      );
    }),
  );

  return result.flat();
};

const getCargoTomlCandidates: CandidateGetter = async (root) => {
  if (!root) {
    return [];
  }

  const rootCargoToml = vscode.Uri.joinPath(root.uri, 'Cargo.toml');
  const content = await readFileText(rootCargoToml);
  if (!content) {
    return [];
  }

  const data = parse(content) as { package?: { name?: string }; workspace?: { members?: string[] } };
  const members = data.workspace?.members;
  const rootCommand = data.package?.name
    ? [
        {
          id: createCandidateId('Cargo.toml', 'Cargo.toml', data.package.name, 'cargo run'),
          displayName: data.package.name,
          command: 'cargo run',
          cwd: '.',
          from: 'Cargo.toml',
          sourceFile: 'Cargo.toml',
        } satisfies ImportCommandCandidate,
      ]
    : [];

  if (!Array.isArray(members)) {
    return rootCommand;
  }

  const cargoTomlPaths = members.map((member) => vscode.Uri.joinPath(root.uri, member, 'Cargo.toml'));
  const cargoTomlContents = await Promise.all(
    cargoTomlPaths.map(async (path) => ({
      path,
      content: await readFileText(path),
    })),
  );

  const memberCommands = cargoTomlContents
    .filter((item): item is { path: vscode.Uri; content: string } => Boolean(item.content))
    .map(({ path: cargoTomlPath, content }): ImportCommandCandidate | null => {
      const data = parse(content) as { package?: { name?: string } };
      if (!data.package?.name) {
        return null;
      }

      const sourceFile = joinUri(root, cargoTomlPath);
      const command = `cargo run --bin ${data.package.name}`;
      return {
        id: createCandidateId('Cargo.toml', sourceFile, data.package.name, command),
        displayName: data.package.name,
        command,
        cwd: path.dirname(sourceFile),
        from: 'Cargo.toml',
        sourceFile,
      };
    })
    .filter((item): item is ImportCommandCandidate => Boolean(item));

  return [...rootCommand, ...memberCommands];
};

const getImportSource = async (source: ImportSource, loader: CandidateGetter): Promise<ImportSourceGroup> => {
  const result: ImportSourceGroup = { source, commands: [], error: null };
  try {
    result.commands = await loader(vscode.workspace.workspaceFolders?.[0] ?? null);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  return result;
};

const getImportPanelState = async () => {
  const sources = [
    await getImportSource('package.json', getPackageJsonCandidates),
    await getImportSource('Cargo.toml', getCargoTomlCandidates),
  ].filter((group) => group.commands.length > 0 || group.error);

  return {
    commands: load(),
    showImports: true,
    sources,
  };
};

const getConfigPanelState = () => ({
  commands: load(),
  showImports: false,
  sources: [],
});

const serializeCommands = (commands: CommandConfig[]) =>
  commands.map((command) => ({
    displayName: command.displayName?.trim() || undefined,
    command: command.command.trim(),
    monitorTarget: command.monitorTarget?.trim() || undefined,
    cwd: command.cwd?.trim() || undefined,
    from: command.from,
  }));

const openConfigPanel = async (
  context: vscode.ExtensionContext,
  viewType: string,
  state: Awaited<ReturnType<typeof getImportPanelState>> | ReturnType<typeof getConfigPanelState>,
) => {
  const panel = vscode.window.createWebviewPanel(viewType, t('config-panel.title'), vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  const nonce = Math.random().toString(36).slice(2);
  panel.webview.html = configPanelTemplate
    .replace(/['"]__([a-z-.]+)__['"]/g, (_, key) =>
      t(key)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;'),
    )
    .replaceAll('__nonce__', nonce)
    .replaceAll(`__cspSource__`, panel.webview.cspSource);

  panel.webview.onDidReceiveMessage(
    async (message: { type?: string; commands?: CommandConfig[] }) => {
      if (message.type !== 'save' || !Array.isArray(message.commands)) {
        return;
      }

      const commands = serializeCommands(message.commands).filter((command) => command.command);
      await save(commands);
      await panel.webview.postMessage({ type: 'saved', commands });
      vscode.window.showInformationMessage(t('config-panel.saved-message'));
    },
    undefined,
    context.subscriptions,
  );

  panel.webview.postMessage({ type: 'init', state });
};

export const openImportCommandsPanel = async (context: vscode.ExtensionContext) => {
  await openConfigPanel(context, 'simpleLauncherImportCommands', await getImportPanelState());
};

export const openConfigCommandsPanel = async (context: vscode.ExtensionContext) => {
  await openConfigPanel(context, 'simpleLauncherConfigPanel', getConfigPanelState());
};

export const load = () => config().get<CommandConfig[]>('custom-commands', []);

export const save = (commands: CommandConfig[], configurationTarget = vscode.ConfigurationTarget.Workspace) => {
  return config().update('custom-commands', commands, configurationTarget);
};
