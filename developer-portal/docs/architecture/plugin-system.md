---
sidebar_position: 4
title: Plugin System
---

# Plugin System Architecture

Plugins extend MES with custom functionality.

## Plugin Execution Model

1. Plugin loaded at startup
2. Hooks registered with event system
3. When event fires, plugin hook is called
4. Plugin executes in sandboxed environment
5. Result passed back to core system

## Sandbox Isolation

- Each plugin runs in isolated JavaScript context
- Access to MES API via whitelist
- Cannot access file system or network directly
- Memory and CPU limits enforced

See [Plugins Guide](../plugins/overview.md).
