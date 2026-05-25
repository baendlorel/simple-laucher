import type { CommandConfig } from '@/types/index.js';
import vscode from 'vscode';
import { parse } from 'smol-toml';
import configPanelTemplate from '@/template/config-panel.html?raw';
import { t } from './l10n.js';

const config = () => vscode.workspace.getConfiguration('simple-launcher');
const textDecoder = new TextDecoder();
type ImportSource = NonNullable<CommandConfig['from']>;

interface ImportCommandCandidate extends CommandConfig {
  id: string;
  sourceFile: string;
}

interface ImportSourceGroup {
  source: ImportSource;
  commands: ImportCommandCandidate[];
  error: string | null;
}

const readFileText = async (uri: vscode.Uri) => textDecoder.decode(await vscode.workspace.fs.readFile(uri));

const tryReadFileText = async (uri: vscode.Uri) => {
  try {
    return await readFileText(uri);
  } catch {
    return null;
  }
};

const normalizePath = (value: string) => value.replaceAll('\\', '/');

const serializeStateForScript = (value: unknown) =>
  JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getConfigPanelLabels = () => ({
  panelTitle: t('config-panel.title'),
  save: t('config-panel.save'),
  commands: t('config-panel.commands'),
  displayName: t('config-panel.display-name'),
  command: t('config-panel.command'),
  monitorTarget: t('config-panel.monitor-target'),
  monitorTargetHelp: t('config-panel.monitor-target.help'),
  importFrom: t('config-panel.import-from'),
  found: t('config-panel.found'),
  noCommandsFound: t('config-panel.no-commands-found'),
  selectAll: t('config-panel.select-all'),
  clear: t('config-panel.clear'),
  importSelected: t('config-panel.import-selected'),
  noCommandsSelected: t('config-panel.no-commands-selected'),
  imported: t('config-panel.imported'),
  noCommandsConfigured: t('config-panel.no-commands-configured'),
  removeCommand: t('config-panel.remove-command'),
  saving: t('config-panel.saving'),
  saved: t('config-panel.saved'),
});

const replaceTemplateLabels = (html: string, labels: Record<string, string>) =>
  Object.entries(labels).reduce((current, [key, value]) => current.replaceAll(`{{${key}}}`, escapeHtml(value)), html);

const getNonce = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
};

const parsePackageJson = (content: string) =>
  JSON.parse(content) as { name?: string; scripts?: Record<string, string> };

const getRelativePath = (root: vscode.WorkspaceFolder, uri: vscode.Uri) => {
  const relativePath = normalizePath(vscode.workspace.asRelativePath(uri, false));
  return relativePath.startsWith(`${root.name}/`) ? relativePath.slice(root.name.length + 1) : relativePath;
};

const createCandidateId = (source: ImportSource, sourceFile: string, displayName: string, command: string) =>
  `${source}:${sourceFile}:${displayName}:${command}`;

const getDirectoryFromRelativeFile = (relativeFile: string) => {
  const index = relativeFile.lastIndexOf('/');
  return index === -1 ? '.' : relativeFile.slice(0, index);
};

const ignoredPackageJsonDirs = new Set([
  '.git',
  '.hg',
  '.svn',
  '.vscode',
  '.vscode-test',
  'node_modules',
  'out',
  'dist',
  'build',
  'coverage',
]);

const isIgnoredPackageJson = (root: vscode.WorkspaceFolder, uri: vscode.Uri) =>
  getRelativePath(root, uri)
    .split('/')
    .some((segment) => ignoredPackageJsonDirs.has(segment));

const findPackageJsonFiles = async (root: vscode.WorkspaceFolder) => {
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(root, '**/package.json'),
    new vscode.RelativePattern(root, '**/{.git,.hg,.svn,.vscode,.vscode-test,node_modules,out,dist,build,coverage}/**'),
  );

  return files
    .filter((uri) => !isIgnoredPackageJson(root, uri))
    .sort((a, b) => {
      const aPath = getRelativePath(root, a);
      const bPath = getRelativePath(root, b);
      if (aPath === 'package.json') {
        return -1;
      }
      if (bPath === 'package.json') {
        return 1;
      }
      return aPath.localeCompare(bPath);
    });
};

const getPackageJsonCandidates = async (root: vscode.WorkspaceFolder | null): Promise<ImportCommandCandidate[]> => {
  if (!root) {
    return [];
  }

  const packageJsonFiles = await findPackageJsonFiles(root);
  const packageCommands = await Promise.all(
    packageJsonFiles.map(async (uri) => {
      const content = await tryReadFileText(uri);
      if (!content) {
        return [];
      }

      const data = parsePackageJson(content);
      const sourceFile = getRelativePath(root, uri);
      const packageDir = getDirectoryFromRelativeFile(sourceFile);
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

  return packageCommands.flat();
};

const getCargoTomlCandidates = async (root: vscode.WorkspaceFolder | null): Promise<ImportCommandCandidate[]> => {
  if (!root) {
    return [];
  }

  const rootCargoToml = vscode.Uri.joinPath(root.uri, 'Cargo.toml');
  const content = await tryReadFileText(rootCargoToml);
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
      content: await tryReadFileText(path),
    })),
  );

  const memberCommands = cargoTomlContents
    .filter((item): item is { path: vscode.Uri; content: string } => Boolean(item.content))
    .map(({ path: cargoTomlPath, content }): ImportCommandCandidate | null => {
      const data = parse(content) as { package?: { name?: string } };
      if (!data.package?.name) {
        return null;
      }

      const sourceFile = getRelativePath(root, cargoTomlPath);
      const command = `cargo run --bin ${data.package.name}`;
      return {
        id: createCandidateId('Cargo.toml', sourceFile, data.package.name, command),
        displayName: data.package.name,
        command,
        cwd: getDirectoryFromRelativeFile(sourceFile),
        from: 'Cargo.toml',
        sourceFile,
      };
    })
    .filter((item): item is ImportCommandCandidate => Boolean(item));

  return [...rootCommand, ...memberCommands];
};

const getImportSource = async (
  source: ImportSource,
  loader: (root: vscode.WorkspaceFolder | null) => Promise<ImportCommandCandidate[]>,
): Promise<ImportSourceGroup> => {
  try {
    return {
      source,
      commands: await loader(vscode.workspace.workspaceFolders?.[0] ?? null),
      error: null,
    };
  } catch (error) {
    return {
      source,
      commands: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const getCurrentCustomCommands = () => config().get<CommandConfig[]>('custom-commands', []);

const getImportPanelState = async () => {
  const sources = [
    await getImportSource('package.json', getPackageJsonCandidates),
    await getImportSource('Cargo.toml', getCargoTomlCandidates),
  ].filter((group) => group.commands.length > 0 || group.error);

  return {
    commands: getCurrentCustomCommands(),
    sources,
  };
};

const serializeCommands = (commands: CommandConfig[]) =>
  commands.map((command) => ({
    displayName: command.displayName?.trim() || undefined,
    command: command.command.trim(),
    monitorTarget: command.monitorTarget?.trim() || undefined,
    cwd: command.cwd?.trim() || undefined,
    from: command.from,
  }));

export const openImportCommandsPanel = async (context: vscode.ExtensionContext) => {
  const labels = getConfigPanelLabels();
  const panel = vscode.window.createWebviewPanel(
    'simpleLauncherImportCommands',
    labels.panelTitle,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  const nonce = getNonce();
  const state = await getImportPanelState();
  panel.webview.html = replaceTemplateLabels(configPanelTemplate, labels)
    .replaceAll('{{nonce}}', nonce)
    .replaceAll('{{cspSource}}', panel.webview.cspSource)
    .replace('{{labels}}', serializeStateForScript(labels))
    .replace('{{initialState}}', serializeStateForScript(state));

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
};

export const load = async () => {
  return getCurrentCustomCommands();
};

export const save = (commands: CommandConfig[], configurationTarget = vscode.ConfigurationTarget.Workspace) => {
  return config().update('custom-commands', commands, configurationTarget);
};
