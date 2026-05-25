import vscode from 'vscode';

const zh = {
  'menu.title': '选择想要运行的命令',
  'status-bar.text': '简易启动',
};

const en: typeof zh = {
  'menu.title': 'Select a command to run',
  'status-bar.text': 'Simple Launch',
};

const dict = vscode.env.language.includes('zh') ? zh : en;

export const t = (key: keyof typeof dict, ...args: string[]): string => {
  let template = dict[key] || key;
  args.forEach((arg, index) => (template = template.replace(`{${index}}`, arg)));
  return template;
};
