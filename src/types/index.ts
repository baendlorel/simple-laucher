export interface CommandConfig {
  /**
   * The name of the process to monitor. Can be string or regex pattern string.
   * It can will be matched by `===` and then `new RegExp(processName).test`
   *
   * If not provided, the monitor will be disabled.
   */
  monitorTarget?: string;

  /**
   * The display name of the command, which will be shown in the UI. It can be the same as the command, or a more user-friendly name.
   *
   * If not provided, the command itself will be used as the display name.
   */
  displayName?: string;

  /**
   * The command to execute.
   */
  command: string;

  /**
   * The working directory for the command. It can be passed to execSync options.cwd.
   */
  cwd?: string;

  from?: ImportSource;
}

export type CurrentCommandConfig = CommandConfig | null;

export type ImportSource = 'package.json' | 'Cargo.toml';

export interface ImportCommandCandidate extends CommandConfig {
  id: string;
  sourceFile: string;
}

export interface ImportSourceGroup {
  source: ImportSource;
  commands: ImportCommandCandidate[];
}
