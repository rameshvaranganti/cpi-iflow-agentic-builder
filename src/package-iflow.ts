import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export interface IFlowBundleConfig {
  packageId: string;
  iflowId: string;
  iflowName: string;
  outputPath?: string;
  scenarioIflwContent: string;
  parametersPropdefContent: string;
  xsltContent?: string;
  logScriptContent?: string;
  exceptionScriptContent?: string;
}

export async function createDeployableIFlowZip(config: IFlowBundleConfig): Promise<string> {
  const outputDir = config.outputPath || path.resolve(process.cwd(), 'dist-bundles');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zipFilePath = path.join(outputDir, `${config.iflowId}.zip`);
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(zipFilePath));
    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    // 1. MANIFEST.MF
    const manifest = [
      'Manifest-Version: 1.0',
      'Bundle-ManifestVersion: 2',
      `Bundle-Name: ${config.iflowName}`,
      `Bundle-SymbolicName: ${config.iflowId}`,
      'Bundle-Version: 1.0.0',
      'Bundle-Vendor: Agentic Integration Hub (https://agenticintegrationhub.com/)',
      'Created-By: Agentic Integration Hub MCP Engine',
      'Require-Capability: osgi.extender; filter:="(osgi.extender=osgi.blueprint)"',
      ''
    ].join('\n');
    archive.append(manifest, { name: 'META-INF/MANIFEST.MF' });

    // 2. Blueprint XML
    const blueprint = `<?xml version="1.0" encoding="UTF-8"?>
<blueprint xmlns="http://www.osgi.org/xmlns/blueprint/v1.0.0"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://www.osgi.org/xmlns/blueprint/v1.0.0 http://www.osgi.org/xmlns/blueprint/v1.0.0/blueprint.xsd">
</blueprint>`;
    archive.append(blueprint, { name: 'OSGI-INF/blueprint/beans.xml' });

    // 3. Artifact Files
    archive.append(config.scenarioIflwContent, { name: 'src/main/resources/scenario.iflw' });
    archive.append(config.parametersPropdefContent, { name: 'src/main/resources/parameters.propdef' });

    if (config.xsltContent) {
      archive.append(config.xsltContent, { name: 'src/main/resources/mapping/ORDERS05_To_CSV.xsl' });
    }
    if (config.logScriptContent) {
      archive.append(config.logScriptContent, { name: 'src/main/resources/script/LogPayload.groovy' });
    }
    if (config.exceptionScriptContent) {
      archive.append(config.exceptionScriptContent, { name: 'src/main/resources/script/ExceptionHandler.groovy' });
    }

    archive.finalize();
  });
}