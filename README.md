# Simple Launcher

**English** | [中文](README.zh-cn.md)

A VS Code extension for quickly launching commands while monitoring program memory usage.

## Features

- 🚀 **Quick Launch**: Execute frequently used commands from a status bar menu
- 📊 **Memory Monitoring**: Track memory usage of running programs
- ⚙️ **Custom Commands**: Define your own commands with display names and working directories
- 🎯 **Smart Terminal**: Automatic terminal management for command execution

## Getting Started

### Configuration

Add commands to your VS Code settings (`settings.json`):

```json
{
  "simple-launcher.custom-commands": [
    {
      "command": "npm run dev",
      "displayName": "Start Dev Server",
      "monitorTarget": "node",
      "cwd": "${workspaceFolder}"
    }
  ],
  "simple-launcher.monitor-interval": 1
}
```

### Commands

- **Simple Launcher: Open Menu** (`Ctrl+Shift+P` → `Simple Launcher: Open Menu`)
- **Simple Launcher: Import Commands**
- **Simple Launcher: Config Panel**

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `custom-commands` | array | `[]` | List of custom commands to execute |
| `monitor-interval` | number | `1` | Memory monitoring interval in seconds |

## Command Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `command` | string | ✓ | The command to execute |
| `displayName` | string | - | Display name in menu |
| `monitorTarget` | string | - | Process name to monitor (e.g., "node") |
| `cwd` | string | - | Working directory (supports `${workspaceFolder}`) |

## License

MIT
