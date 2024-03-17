import { App } from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { Template } from 'aws-cdk-lib/assertions';

test('Api Stack', () => {
  const app = new App();
  const apiStack = new ApiStack(app, 'ApiStack', {
    env: {
      account: '12345678',
      region: 'eu-west-2',
    },
    certificateArn: 'mockCertificateArn',
    domainName: 'mockdomain.test',
    subdomain: 'mocksubdomain',
    appConfig: {
      applicationName: 'mockapplicationname',
      environmentName: 'mockenvironmentname',
    },
  });
  const template = Template.fromStack(apiStack);
  const json = template.toJSON();
  expect(json).toMatchSnapshot({
    Resources: {
      ...json.Resources,
      ApiFunctionCE271BD4: {
        ...json.Resources.ApiFunctionCE271BD4,
        Properties: {
          ...json.Resources.ApiFunctionCE271BD4.Properties,
          Code: { S3Key: expect.any(String) },
        },
      },
    },
  });
});
