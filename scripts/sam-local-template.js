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

// SAM's `--env-vars` only OVERRIDES variables that already exist in a function's
// Environment.Variables block — it does not ADD new ones. So `API_DB_ENDPOINT`
// (which is not in the synthed template) would be silently dropped, leaving the
// AWS SDK pointed at the real DynamoDB endpoint. Seed every key from sam-env.json
// into each function's Environment block (as an empty placeholder if absent) so
// SAM has something to override. The real values still come from sam-env.json.
const envVarsFile = path.join(__dirname, '..', 'sam-env.json');
let seededKeys = [];
if (fs.existsSync(envVarsFile)) {
  const samEnv = JSON.parse(fs.readFileSync(envVarsFile, 'utf8'));
  const keysByLogicalId = new Map(
    Object.entries(samEnv).map(([id, vars]) => [id, Object.keys(vars)]),
  );
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (resource.Type !== 'AWS::Lambda::Function') continue;
    const keys = keysByLogicalId.get(logicalId);
    if (!keys) continue;
    resource.Properties.Environment = resource.Properties.Environment || {};
    const vars = (resource.Properties.Environment.Variables =
      resource.Properties.Environment.Variables || {});
    for (const key of keys) {
      if (!(key in vars)) {
        vars[key] = '';
        seededKeys.push(`${logicalId}.${key}`);
      }
    }
  }
}

fs.writeFileSync(dest, JSON.stringify(template, null, 2));
console.info(
  `Wrote ${path.relative(process.cwd(), dest)} ` +
    `(removed ${removedMocks} MOCK method(s), stripped layers from ${strippedLayers} function(s), ` +
    `seeded ${seededKeys.length} env placeholder(s))`,
);
