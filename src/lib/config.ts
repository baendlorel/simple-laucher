import type {
  CommandConfig,
  CurrentCommandConfig,
  ImportCommandCandidate,
  ImportSource,
  ImportSourceGroup,
} from '@/types/index.js';
import vscode from 'vscode';
import path from 'node:path';
import { parse } from 'smol-toml';

import configPanelTemplate from '@/template/config-panel.html?raw';
import { t } from './l10n.js';
import { errPop, readFileText } from './native.js';
import { FullCommandName } from '@/types/global.js';

const config = () => vscode.workspace.getConfiguration('simple-launcher');

const trimOrNull = (value: string | null | undefined) => value?.trim() || null;

export const normalizeCommandConfig = (value: Partial<CommandConfig> | null | undefined): CurrentCommandConfig => {
  if (!value) {
    return null;
  }

  const command = trimOrNull(value.command);
  if (!command) {
    return null;
  }

  return {
    command,
    displayName: trimOrNull(value.displayName) ?? undefined,
    monitorTarget: trimOrNull(value.monitorTarget) ?? undefined,
    cwd: trimOrNull(value.cwd) ?? undefined,
    from: value.from,
  };
};

const relativeUri = (root: vscode.WorkspaceFolder, uri: vscode.Uri) =>
  path.relative(root.uri.fsPath, uri.fsPath) || '.';

const createCandidateId = (source: ImportSource, sourceFile: string, displayName: string, command: string) =>
  `${source}:${sourceFile}:${displayName}:${command}`;

const findPackageJsonFiles = async (root: vscode.WorkspaceFolder) =>
  vscode.workspace.findFiles(
    new vscode.RelativePattern(root, '**/package.json'),
    new vscode.RelativePattern(root, '**/{.git,.hg,.svn,.vscode,.vscode-test,node_modules,out,dist,build,coverage}/**'),
  );

type CandidateGetter = (root: vscode.WorkspaceFolder | undefined) => Promise<ImportCommandCandidate[]>;

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
      const sourceFile = relativeUri(root, uri);
      const packageDir = path.dirname(sourceFile);
      const isRootPackage = sourceFile === 'package.json';
      const displayPrefix = data.name ?? packageDir;
      const cwd = packageDir === '.' ? undefined : packageDir;

      return Object.entries(data.scripts ?? {}).map(
        ([key, value]): ImportCommandCandidate => ({
          id: createCandidateId('package.json', sourceFile, isRootPackage ? key : `${displayPrefix}:${key}`, value),
          displayName: isRootPackage ? key : `${displayPrefix}:${key}`,
          command: value,
          cwd,
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

      const sourceFile = relativeUri(root, cargoTomlPath);
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

const getPanelState = async (viewType: FullCommandName) => {
  const result = {
    commands: load(),
    showImports: true,
    sources: [] as ImportSourceGroup[],
  };

  if (viewType === 'simple-launcher.import-commands') {
    const root = vscode.workspace.workspaceFolders?.[0];
    const pj = (await getPackageJsonCandidates(root).catch(errPop)) ?? [];
    const cargo = (await getCargoTomlCandidates(root).catch(errPop)) ?? [];
    const sources = (
      [
        { source: 'package.json', commands: pj },
        { source: 'Cargo.toml', commands: cargo },
      ] satisfies ImportSourceGroup[]
    ).filter((group) => group.commands.length > 0);
    result.sources = sources;
  }

  return result;
};

export const openPanel = async (cx: vscode.ExtensionContext, viewType: FullCommandName) => {
  const state = await getPanelState(viewType);
  const panel = vscode.window.createWebviewPanel(viewType, t('config-panel.title'), vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  const nonce = Math.random().toString(36).slice(2);

  panel.webview.onDidReceiveMessage(
    async (message: { type?: string; commands?: CommandConfig[] }) => {
      if (message.type === 'ready') {
        await panel.webview.postMessage({ type: 'init', state });
        return;
      }

      if (message.type !== 'save' || !Array.isArray(message.commands)) {
        return;
      }

      const commands = message.commands
        .map(normalizeCommandConfig)
        .filter((value): value is CommandConfig => value !== null);
      await save(commands);
      await panel.webview.postMessage({ type: 'saved', commands });
      vscode.window.showInformationMessage(t('config-panel.saved-message'));
    },
    undefined,
    cx.subscriptions,
  );

  panel.webview.html = configPanelTemplate
    .replace(/"__(config-panel\.[a-z-.]+)__"/g, (_, key) =>
      t(key)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;'),
    )
    .replace(/'__(config-panel\.[a-z-.]+)__'/g, (_, key) => JSON.stringify(t(key)))
    .replaceAll('__nonce__', nonce)
    .replaceAll(`__cspSource__`, panel.webview.cspSource);
};

export const load = () => config().get<CommandConfig[]>('custom-commands', []);

export const loadCurrentCommand = (): CurrentCommandConfig =>
  normalizeCommandConfig(config().get<CommandConfig | null>('current-command', null));

export const save = (commands: CommandConfig[], configurationTarget = vscode.ConfigurationTarget.Workspace) =>
  config().update('custom-commands', commands, configurationTarget);

export const saveCurrentCommand = (
  command: CurrentCommandConfig,
  configurationTarget = vscode.ConfigurationTarget.Workspace,
) => config().update('current-command', normalizeCommandConfig(command), configurationTarget);
