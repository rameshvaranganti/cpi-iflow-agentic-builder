#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BuildIFlowSchema } from './types.js';
import {
  generateScenarioIflw,
  generateParametersPropdef,
  orders05XsltContent,
  logPayloadGroovyContent,
  exceptionHandlerGroovyContent
} from './templates.js';
import { createDeployableIFlowZip } from './package-iflow.js';
import { BTPDeployerEngine } from './btpDeployer.js';
import { ZeroTrustMasker } from './security/zeroTrustMasker.js';

const server = new Server(
  {
    name: '@agenticintegrationhub/cpi-iflow-builder-mcp',
    version: '1.0.0'
  },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'build_cpi_iflow_artifact',
        description: 'Designs SAP CPI iFlow artifacts (BPMN XML, externalized parameters, Groovy, XSLT 3.0) by Agentic Integration Hub.',
        inputSchema: {
          type: 'object',
          properties: {
            packageId: { type: 'string' },
            iflowId: { type: 'string' },
            iflowName: { type: 'string' },
            ingressType: { type: 'string', enum: ['IDOC', 'HTTPS', 'TIMER', 'DUAL'] },
            targetAdapter: { type: 'string', enum: ['SFTP', 'HTTP', 'FILE', 'PROCESSDIRECT'] }
          },
          required: ['packageId', 'iflowId', 'iflowName']
        }
      },
      {
        name: 'export_cpi_iflow_zip',
        description: 'Packages scenario.iflw, parameters.propdef, and Groovy scripts into a deployable OSGi ZIP bundle.',
        inputSchema: {
          type: 'object',
          properties: {
            packageId: { type: 'string' },
            iflowId: { type: 'string' },
            iflowName: { type: 'string' },
            outputDirectory: { type: 'string' }
          },
          required: ['packageId', 'iflowId', 'iflowName']
        }
      },
      {
        name: 'deploy_custom_iflow_to_btp',
        description: 'Deploys generated iFlow bundles directly into an SAP BTP Integration Suite tenant using OData APIs.',
        inputSchema: {
          type: 'object',
          properties: {
            serviceKeyJson: { type: 'string' },
            packageId: { type: 'string' },
            iflowId: { type: 'string' },
            iflowName: { type: 'string' }
          },
          required: ['serviceKeyJson', 'packageId', 'iflowId', 'iflowName']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const rawArgs = request.params.arguments as any;

  try {
    if (toolName === 'build_cpi_iflow_artifact') {
      const input = BuildIFlowSchema.parse(rawArgs);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              meta: {
                author: 'Rameshkumar Varanganti / Agentic Integration Hub (https://agenticintegrationhub.com/)',
                packageId: input.packageId,
                iflowId: input.iflowId
              },
              files: {
                'scenario.iflw': generateScenarioIflw(input.iflowId, input.iflowName),
                'parameters.propdef': generateParametersPropdef(input.customParameters),
                'ORDERS05_To_CSV.xsl': orders05XsltContent,
                'LogPayload.groovy': logPayloadGroovyContent,
                'ExceptionHandler.groovy': exceptionHandlerGroovyContent
              }
            }, null, 2)
          }
        ]
      };
    }

    if (toolName === 'export_cpi_iflow_zip') {
      const zipPath = await createDeployableIFlowZip({
        packageId: rawArgs.packageId,
        iflowId: rawArgs.iflowId,
        iflowName: rawArgs.iflowName,
        outputPath: rawArgs.outputDirectory,
        scenarioIflwContent: generateScenarioIflw(rawArgs.iflowId, rawArgs.iflowName),
        parametersPropdefContent: generateParametersPropdef(),
        xsltContent: orders05XsltContent,
        logScriptContent: logPayloadGroovyContent,
        exceptionScriptContent: exceptionHandlerGroovyContent
      });

      return {
        content: [{ type: 'text', text: `Bundle created: ${zipPath}` }]
      };
    }

    if (toolName === 'deploy_custom_iflow_to_btp') {
      const serviceKey = JSON.parse(rawArgs.serviceKeyJson);
      const deployer = new BTPDeployerEngine(serviceKey);

      const result = await deployer.deployCustomerIFlow({
        packageId: rawArgs.packageId,
        iflowId: rawArgs.iflowId,
        iflowName: rawArgs.iflowName,
        scenarioIflwContent: generateScenarioIflw(rawArgs.iflowId, rawArgs.iflowName),
        parametersPropdefContent: generateParametersPropdef(),
        mappingFiles: { 'ORDERS05_To_CSV.xsl': orders05XsltContent },
        scriptFiles: {
          'LogPayload.groovy': logPayloadGroovyContent,
          'ExceptionHandler.groovy': exceptionHandlerGroovyContent
        }
      });

      return {
        content: [{ type: 'text', text: `Artifact ${result.iflowId} successfully deployed to BTP.` }]
      };
    }

    throw new Error(`Unrecognized tool: ${toolName}`);
  } catch (err: any) {
    const safeError = ZeroTrustMasker.maskText(err?.message || 'Execution error');
    return {
      isError: true,
      content: [{ type: 'text', text: `Execution failed: ${safeError}` }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal MCP startup error:', err);
  process.exit(1);
});