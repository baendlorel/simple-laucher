import vscode from 'vscode';

const zh = {
  'menu.title': '选择想要运行的命令',
  'menu.empty.title': '工作区还没有配置命令',
  'menu.empty.placeholder': '要打开导入面板吗？',
  'menu.empty.import': '$(cloud-download) 打开导入面板',
  'menu.empty.import.description': '从 package.json 或 Cargo.toml 导入命令',
  'menu.empty.cancel': '暂时不用',
  'menu.config': '打开配置面板',
  'menu.config.description': '新增、编辑或删除命令',
  'menu.monitoring': '监控：{0}',
  'menu.not-available': '无',
  'status-bar.text': '简易运行',
  'config-panel.title': 'Simple Launcher 命令',
  'config-panel.save': '保存 (Ctrl+S)',
  'config-panel.commands': '命令',
  'config-panel.add-command': '新增命令',
  'config-panel.display-name': '展示名称',
  'config-panel.command': '命令',
  'config-panel.cwd': '工作目录',
  'config-panel.monitor-target': '内存监控进程名（Regex 或 string）',
  'config-panel.monitor-target.help':
    'monitorTarget 会用两种方式匹配进程：先判断是否相等，再用 new RegExp(monitorTarget).test(processName) 判断。',
  'config-panel.import-from': '从 {0} 导入',
  'config-panel.found': '找到 {0} 条',
  'config-panel.no-importable-commands': '没有找到可以导入的命令，可以手动添加。',
  'config-panel.no-commands-found': '{0} 中没有找到命令。',
  'config-panel.select-all': '全选',
  'config-panel.clear': '清空',
  'config-panel.import-selected': '导入选中项',
  'config-panel.no-commands-selected': '没有选择命令。',
  'config-panel.imported': '已导入 {0} 条命令。',
  'config-panel.no-commands-configured': '还没有配置命令。',
  'config-panel.remove-command': '删除命令',
  'config-panel.saving': '保存中...',
  'config-panel.saved': '已保存。',
  'config-panel.saved-message': 'Simple Launcher 命令已保存。',
};

const en: typeof zh = {
  'menu.title': 'Select a command to run',
  'menu.empty.title': 'No commands are configured in this workspace',
  'menu.empty.placeholder': 'Open the import panel?',
  'menu.empty.import': '$(cloud-download) Open import panel',
  'menu.empty.import.description': 'Import commands from package.json or Cargo.toml',
  'menu.empty.cancel': 'Not now',
  'menu.config': 'Open config panel',
  'menu.config.description': 'Add, edit, or remove commands',
  'menu.monitoring': 'Monitoring: {0}',
  'menu.not-available': 'N/A',
  'status-bar.text': 'Simple Launcher',
  'config-panel.title': 'Simple Launcher Commands',
  'config-panel.save': 'Save (Ctrl+S)',
  'config-panel.commands': 'Commands',
  'config-panel.add-command': 'Add command',
  'config-panel.display-name': 'Display Name',
  'config-panel.command': 'Command',
  'config-panel.cwd': 'Working Directory',
  'config-panel.monitor-target': 'Monitor Target (Regex or string)',
  'config-panel.monitor-target.help':
    'monitorTarget matches a process in two ways: direct equality first, then new RegExp(monitorTarget).test(processName).',
  'config-panel.import-from': 'Import from {0}',
  'config-panel.found': '{0} found',
  'config-panel.no-importable-commands': 'No importable commands found. You can add one manually.',
  'config-panel.no-commands-found': 'No commands found in {0}.',
  'config-panel.select-all': 'Select all',
  'config-panel.clear': 'Clear',
  'config-panel.import-selected': 'Import selected',
  'config-panel.no-commands-selected': 'No commands selected.',
  'config-panel.imported': '{0} command(s) imported.',
  'config-panel.no-commands-configured': 'No commands configured.',
  'config-panel.remove-command': 'Remove command',
  'config-panel.saving': 'Saving...',
  'config-panel.saved': 'Saved.',
  'config-panel.saved-message': 'Simple Launcher commands saved.',
};

const dict = vscode.env.language.includes('zh') ? zh : en;

export const t = (key: keyof typeof dict, ...args: string[]): string => {
  let template = dict[key] || key;
  args.forEach((arg, index) => (template = template.replace(`{${index}}`, arg)));
  return template;
};
