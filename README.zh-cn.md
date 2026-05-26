# Simple Launcher

**中文** | [English](README.md)

一个 VS Code 扩展，帮助你快速启动命令并监控程序内存用量。

## 特性

- 🚀 **快速启动**：通过状态栏菜单执行常用命令
- 📊 **内存监控**：实时跟踪运行程序的内存使用情况
- ⚙️ **自定义命令**：定义带有显示名称和工作目录的命令
- 🎯 **智能终端**：自动管理终端以执行命令

## 快速开始

### 配置

在 VS Code 设置中添加命令 (`settings.json`)：

```json
{
  "simple-launcher.custom-commands": [
    {
      "command": "npm run dev",
      "displayName": "启动开发服务器",
      "monitorTarget": "node",
      "cwd": "${workspaceFolder}"
    }
  ],
  "simple-launcher.monitor-interval": 1
}
```

### 命令

- **Simple Launcher: 打开菜单** (`Ctrl+Shift+P` → `Simple Launcher: Open Menu`)
- **Simple Launcher: 导入命令**
- **Simple Launcher: 配置面板**

## 设置

| 设置 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `custom-commands` | 数组 | `[]` | 自定义命令列表 |
| `monitor-interval` | 数字 | `1` | 内存监控间隔（秒） |

## 命令属性

| 属性 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `command` | 字符串 | ✓ | 要执行的命令 |
| `displayName` | 字符串 | - | 菜单中显示的名称 |
| `monitorTarget` | 字符串 | - | 要监控的进程名（如 "node"） |
| `cwd` | 字符串 | - | 工作目录（支持 `${workspaceFolder}`） |

## 许可证

MIT
