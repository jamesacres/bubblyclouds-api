/**
 * Post-processes the synthesized CDK template so `sam local start-api` can run it.
 *
 * CDK-synthed templates contain constructs that `sam local` cannot handle:
 *   1. MOCK-integration API Gateway methods (from `root.addProxy()`): SAM tries
 *      to resolve a backing Lambda and crashes on `None`.
 *   2. Lambda `Layers` (the AppConfig extension layer): SAM tries to download
 *      the layer from AWS and fails without real credentials. The layer is not
 *      needed locally — `fetchAppConfig` falls back to env overrides when the
 *      AppConfig prefetch var is unset (see sam-env.json).
 *
 * Reads  deploy/cdk.out/ApiStack.template.json
 * Writes deploy/cdk.out/ApiStack.template.local.json
 */
const fs = require('fs');
const path = require('path');

const cdkOut = path.join(__dirname, '..', 'deploy', 'cdk.out');
const src = path.join(cdkOut, 'ApiStack.template.json');
const dest = path.join(cdkOut, 'ApiStack.template.local.json');

const template = JSON.parse(fs.readFileSync(src, 'utf8'));
const resources = template.Resources || {};

let removedMocks = 0;
let strippedLayers = 0;

for (const [key, resource] of Object.entries(resources)) {
  if (
    resource.Type === 'AWS::ApiGateway::Method' &&
    resource.Properties?.Integration?.Type === 'MOCK'
  ) {
    delete resources[key];
    removedMocks += 1;
  }
}

for (const resource of Object.values(resources)) {
  if (
    resource.Type === 'AWS::Lambda::Function' &&
    resource.Properties?.Layers
  ) {
    delete resource.Properties.Layers;
    strippedLayers += 1;
  }
}

fs.writeFileSync(dest, JSON.stringify(template, null, 2));
console.info(
  `Wrote ${path.relative(process.cwd(), dest)} ` +
    `(removed ${removedMocks} MOCK method(s), stripped layers from ${strippedLayers} function(s))`,
);
