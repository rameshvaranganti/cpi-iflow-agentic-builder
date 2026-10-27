import { z } from 'zod';

export const BuildIFlowSchema = z.object({
  packageId: z.string().describe('Target SAP CPI Integration Package ID'),
  iflowId: z.string().describe('Target Technical iFlow ID (e.g. IFL_ORDERS05_TO_FILE)'),
  iflowName: z.string().describe('Human-readable iFlow Name'),
  ingressType: z.enum(['IDOC', 'HTTPS', 'TIMER', 'DUAL']).default('IDOC'),
  targetAdapter: z.enum(['SFTP', 'HTTP', 'FILE', 'PROCESSDIRECT']).default('SFTP'),
  mappingType: z.enum(['XSLT', 'MESSAGE_MAPPING', 'GROOVY']).default('XSLT'),
  customParameters: z.record(z.string()).optional()
});

export type BuildIFlowInput = z.infer<typeof BuildIFlowSchema>;

export interface BTPServiceKey {
  oauth: {
    clientid: string;
    clientsecret: string;
    url: string;
  };
  api_url?: string;
  url?: string;
}

export interface CustomerIFlowRequest {
  packageId: string;
  iflowId: string;
  iflowName: string;
  description?: string;
  scenarioIflwContent: string;
  parametersPropdefContent: string;
  mappingFiles?: Record<string, string>;
  scriptFiles?: Record<string, string>;
}