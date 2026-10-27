# cpi-iflow-agentic-builder

Autonomous SAP Cloud Integration (CPI) iFlow designer, Zero-Trust sanitizer, and Model Context Protocol (MCP) engine developed by **Rameshkumar Varanganti** ([Agentic Integration Hub](https://agenticintegrationhub.com/)).

---

## Global Setup (Zero Cost, No Accounts Needed)

### 1. In Cursor (`.cursor/mcp.json`)
Add this configuration to run the MCP engine directly from GitHub:
```json
{
  "mcpServers": {
    "cpi-iflow-agentic-builder": {
      "command": "npx",
      "args": ["-y", "github:rameshvaranganti/cpi-iflow-agentic-builder"]
    }
  }
}