# @agenticintegrationhub/cpi-iflow-builder-mcp

> **Autonomous SAP Cloud Integration (CPI) iFlow designer, Zero-Trust sanitizer, and MCP generator.**  
> Authored by **Rameshkumar Varanganti** | [Agentic Integration Hub](https://agenticintegrationhub.com/).

[![npm version](https://img.shields.io/npm/v/@agenticintegrationhub/cpi-iflow-builder-mcp.svg)](https://www.npmjs.com/package/@agenticintegrationhub/cpi-iflow-builder-mcp)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview
Connects AI developer assistants (Cursor, Claude Desktop, ChatGPT, Gemini) directly to SAP BTP Integration Suite workflows. Automatically designs BPMN 2.0 XML (`scenario.iflw`), externalized parameters (`parameters.propdef`), XSLT 3.0 stylesheets, and Groovy scripts.

## Installation & MCP Activation (Zero Cost)

Add this directly into your MCP configuration:

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "cpi-iflow-agentic-builder": {
      "command": "npx",
      "args": ["-y", "@agenticintegrationhub/cpi-iflow-builder-mcp"]
    }
  }
}