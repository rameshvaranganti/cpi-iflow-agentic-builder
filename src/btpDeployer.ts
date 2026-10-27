import fs from 'fs';
import path from 'path';
import { BTPServiceKey, CustomerIFlowRequest } from './types.js';
import { createDeployableIFlowZip } from './package-iflow.js';

export class BTPDeployerEngine {
  private serviceKey: BTPServiceKey;
  private tmnBaseUrl: string;

  constructor(serviceKey: BTPServiceKey) {
    this.serviceKey = serviceKey;
    const rawUrl = serviceKey.api_url || serviceKey.url || '';
    this.tmnBaseUrl = rawUrl.replace(/\/$/, '');
    if (!this.tmnBaseUrl) {
      throw new Error('Invalid BTP Service Key: missing api_url or url for Tenant Management (TMN).');
    }
  }

  public async getAccessToken(): Promise<string> {
    const tokenEndpoint = `${this.serviceKey.oauth.url.replace(/\/$/, '')}/oauth/token?grant_type=client_credentials`;
    const basicAuth = Buffer.from(
      `${this.serviceKey.oauth.clientid}:${this.serviceKey.oauth.clientsecret}`
    ).toString('base64');

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!res.ok) {
      throw new Error(`OAuth2 authentication failed: ${res.status} - ${await res.text()}`);
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  public async deployCustomerIFlow(request: CustomerIFlowRequest): Promise<{ status: string; iflowId: string }> {
    const tempDir = path.resolve(process.cwd(), '.tmp_bundles');
    const zipPath = await createDeployableIFlowZip({
      packageId: request.packageId,
      iflowId: request.iflowId,
      iflowName: request.iflowName,
      outputPath: tempDir,
      scenarioIflwContent: request.scenarioIflwContent,
      parametersPropdefContent: request.parametersPropdefContent,
      xsltContent: request.mappingFiles ? Object.values(request.mappingFiles)[0] : undefined,
      logScriptContent: request.scriptFiles?.['LogPayload.groovy'],
      exceptionScriptContent: request.scriptFiles?.['ExceptionHandler.groovy']
    });

    const zipBuffer = fs.readFileSync(zipPath);
    const base64Content = zipBuffer.toString('base64');
    fs.unlinkSync(zipPath);

    const token = await this.getAccessToken();
    const checkUrl = `${this.tmnBaseUrl}/api/v1/IntegrationDesigntimeArtifacts(Id='${encodeURIComponent(request.iflowId)}',Version='active')`;

    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });

    if (checkRes.status === 200) {
      const updateUrl = `${checkUrl}/$value`;
      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
        body: zipBuffer
      });
      if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status} - ${await updateRes.text()}`);
    } else {
      const createUrl = `${this.tmnBaseUrl}/api/v1/IntegrationDesigntimeArtifacts`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          Id: request.iflowId,
          Name: request.iflowName,
          PackageId: request.packageId,
          Description: request.description || 'Synthesized by Agentic Integration Hub',
          ArtifactContent: base64Content
        })
      });
      if (!createRes.ok) throw new Error(`Creation failed: ${createRes.status} - ${await createRes.text()}`);
    }

    const deployUrl = `${this.tmnBaseUrl}/api/v1/DeployIntegrationDesigntimeArtifact?Id='${encodeURIComponent(request.iflowId)}'&Version='active'`;
    await fetch(deployUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });

    return { status: 'DEPLOYED', iflowId: request.iflowId };
  }
}