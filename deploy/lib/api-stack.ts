import { Duration, Fn, RemovalPolicy, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import {
  CfnApplication,
  CfnConfigurationProfile,
  CfnEnvironment,
} from 'aws-cdk-lib/aws-appconfig';
import {
  DomainName,
  EndpointType,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi,
  SecurityPolicy,
} from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Dashboard, GraphWidget, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { AttributeType, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  Rule,
  Schedule,
  ApiDestination,
  Connection,
  Authorization,
  HttpMethod,
  RuleTargetInput,
} from 'aws-cdk-lib/aws-events';
import { ApiDestination as ApiDestinationTarget, LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface ApiStackProps extends StackProps {
  certificateArn: string;
  domainName: string;
  subdomain: string;
  appConfig: { applicationName: string; environmentName: string };
  cron: { username: string; password: string };
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { certificateArn, domainName, subdomain, cron } = props;

    const apiGateway = this.gateway();
    this.domain(apiGateway, {
      certificateArn,
      domainName,
      subdomain,
    });

    const appConfig = this.appConfig(props.appConfig);
    const { api } = this.lambdas({
      appConfig,
      accountId: props.env!.account!,
      region: props.env!.region!,
    });

    const { table, analyticsTable } = this.dynamodb();
    table.grantReadWriteData(api.fn);

    // GET /
    apiGateway.root.addMethod('GET', api.integration);

    // *
    apiGateway.root.addProxy({ defaultIntegration: api.integration });

    // EventBridge rules for sudoku of the day
    this.createSudokuCronJobs(domainName, subdomain, cron);

    const exportBucket = this.createExportBucket();
    const exportLambda = this.createExportLambda(table, exportBucket);
    const aggregatorLambda = this.createAggregatorLambda(exportBucket, analyticsTable);
    this.createAnalyticsDashboard();

    // EventBridge rule for Export Lambda - triggers at 2:00 AM UTC daily
    new Rule(this, 'ExportLambdaSchedule', {
      schedule: Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      targets: [
        new LambdaFunction(exportLambda, {
          event: RuleTargetInput.fromObject({
            mode: 'incremental',
          }),
        }),
      ],
    });

    // EventBridge rule for Aggregator Lambda - triggers at 2:30 AM UTC daily
    new Rule(this, 'AggregatorLambdaSchedule', {
      schedule: Schedule.cron({
        minute: '30',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      targets: [
        new LambdaFunction(aggregatorLambda, {
          event: RuleTargetInput.fromObject({
            mode: 'incremental',
          }),
        }),
      ],
    });

    
  }

  private gateway() {
    return new RestApi(this, 'ApiGateway', {
      restApiName: 'ApiGateway',
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.ERROR,
        tracingEnabled: true,
      },
      cloudWatchRole: true,
      endpointTypes: [EndpointType.EDGE],
    });
  }

  private domain(
    apiGateway: RestApi,
    {
      certificateArn,
      domainName,
      subdomain,
    }: {
      certificateArn: string;
      domainName: string;
      subdomain: string;
    },
  ) {
    const certificate = Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn,
    );
    const domain = new DomainName(this, 'ApiDomain', {
      certificate,
      domainName: `${subdomain}.${domainName}`,
      securityPolicy: SecurityPolicy.TLS_1_2,
      endpointType: EndpointType.EDGE,
    });
    domain.addBasePathMapping(apiGateway);
  }

  private dynamodb() {
    const table = new Table(this, 'ApiTable', {
      partitionKey: { name: 'modelId', type: AttributeType.STRING },
      sortKey: { name: 'owner', type: AttributeType.STRING },
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expiresAt',
      deletionProtection: true,
      readCapacity: 10,
      writeCapacity: 10,
    });

    // As per src/dynamodb/dynamodb-adapter.ts define secondary indexes
    table.addGlobalSecondaryIndex({
      indexName: `ownerIndex`,
      partitionKey: { name: 'owner', type: AttributeType.STRING },
      sortKey: { name: 'modelId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // Analytics table for storing daily metrics with 455-day retention
    const analyticsTable = new Table(this, 'AnalyticsTable', {
      partitionKey: { name: 'date', type: AttributeType.STRING },
      sortKey: { name: 'app', type: AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      readCapacity: 1,
      writeCapacity: 1,
    });

    return { table, analyticsTable };
  }

  private appConfig(options: ApiStackProps['appConfig']): {
    application: CfnApplication;
    environment: CfnEnvironment;
    configuration: CfnConfigurationProfile;
  } {
    const application = new CfnApplication(this, `ApiAppConfigApplication`, {
      name: options.applicationName,
    });
    const environment = new CfnEnvironment(this, 'ApiAppConfigEnvironment', {
      applicationId: application.ref,
      name: options.environmentName,
    });
    const configuration = new CfnConfigurationProfile(
      this,
      `ApiAppConfigConfigurationProfile`,
      {
        applicationId: application.ref,
        locationUri: 'hosted',
        name: options.environmentName,
        type: 'AWS.Freeform',
      },
    );
    return {
      application,
      environment,
      configuration,
    };
  }

  private lambdas(options: {
    accountId: string;
    region: string;
    appConfig: {
      application: CfnApplication;
      environment: CfnEnvironment;
      configuration: CfnConfigurationProfile;
    };
  }) {
    const apiFn = new Function(this, `ApiFunction`, {
      handler: 'main.handler',
      memorySize: 512,
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(15),
      logRetention: RetentionDays.ONE_WEEK,
      code: Code.fromAsset('../dist'),
      functionName: `Api`,
      environment: {
        API_TABLE: 'ApiStack-ApiTable21517941-1JLBDQLD4OA69',
        // https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html
        AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: Fn.sub(
          '/applications/${applicationId}/environments/${environmentId}/configurations/${configurationId}',
          {
            applicationId: options.appConfig.application.name,
            environmentId: options.appConfig.environment.name,
            configurationId: options.appConfig.configuration.name,
          },
        ),
      },
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          'AppConfigLambdaLayer',
          'arn:aws:lambda:eu-west-2:282860088358:layer:AWS-AppConfig-Extension:93',
        ),
      ],
    });
    apiFn.addToRolePolicy(
      new PolicyStatement({
        resources: [
          Fn.sub(
            'arn:aws:appconfig:${region}:${accountId}:application/${applicationId}/environment/${environmentId}/configuration/${configurationId}',
            {
              region: options.region,
              accountId: options.accountId,
              applicationId: options.appConfig.application.ref,
              environmentId: options.appConfig.environment.ref,
              configurationId: options.appConfig.configuration.ref,
            },
          ),
        ],
        actions: [
          'appconfig:GetLatestConfiguration',
          'appconfig:StartConfigurationSession',
        ],
      }),
    );

    return {
      api: {
        fn: apiFn,
        integration: new LambdaIntegration(apiFn, { proxy: true }),
      },
    };
  }

  private createSudokuCronJobs(
    domainName: string,
    subdomain: string,
    cron: ApiStackProps['cron'],
  ) {
    const apiUrl = `https://${subdomain}.${domainName}`;

    // Create connection for API destination
    const connection = new Connection(this, 'SudokuApiConnection', {
      authorization: Authorization.basic(
        cron.username,
        SecretValue.unsafePlainText(cron.password),
      ),
      description: 'Connection for Sudoku API calls',
    });

    const difficulties = [
      { difficulty: 'simple', time: '22:01' },
      { difficulty: 'easy', time: '22:02' },
      { difficulty: 'intermediate', time: '22:03' },
    ];

    difficulties.forEach(({ difficulty, time }) => {
      const [hour, minute] = time.split(':');

      // Create API destination
      const destination = new ApiDestination(
        this,
        `SudokuApiDestination-${difficulty}`,
        {
          connection,
          endpoint: `${apiUrl}/sudoku/ofTheDay?difficulty=${difficulty}&isTomorrow=true`,
          httpMethod: HttpMethod.GET,
          description: `API destination for ${difficulty} sudoku`,
        },
      );

      new Rule(this, `SudokuCronJob-${difficulty}`, {
        schedule: Schedule.cron({
          hour,
          minute,
          day: '*',
          month: '*',
          year: '*',
        }),
        targets: [new ApiDestinationTarget(destination)],
      });
    });

    // Sudoku book of the month
    const destination = new ApiDestination(
      this,
      `SudokuApiDestination-bookOftheMonth`,
      {
        connection,
        endpoint: `${apiUrl}/sudoku/bookOfTheMonth?isNextMonth=true`,
        httpMethod: HttpMethod.GET,
        description: `API destination for book of the month sudoku`,
      },
    );

    new Rule(this, `SudokuCronJob-bookOfTheMonth`, {
      schedule: Schedule.cron({
        hour: '22',
        minute: '04',
        day: '27',
        month: '*',
        year: '*',
      }),
      targets: [new ApiDestinationTarget(destination)],
    });
  }

  private createExportBucket() {
    const exportBucket = new Bucket(this, 'ExportBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: Duration.days(1),
        },
      ],
    });

    return exportBucket;
  }

  private createExportLambda(table: Table, exportBucket: Bucket) {
    const exportLambda = new NodejsFunction(this, 'ExportLambda', {
      entry: 'lib/analytics-lambda/export-trigger.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: Duration.seconds(30),
      logRetention: RetentionDays.ONE_WEEK,
      environment: {
        TABLE_NAME: table.tableArn,
        EXPORT_BUCKET: exportBucket.bucketName,
        S3_PREFIX: 'exports',
      },
    });

    // Grant DynamoDB export permissions
    exportLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['dynamodb:ExportTableToPointInTime'],
        resources: [table.tableArn],
      }),
    );

    // Grant S3 write permissions
    exportBucket.grantPut(exportLambda);
    exportLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:AbortMultipartUpload'],
        resources: [`${exportBucket.bucketArn}/*`],
      }),
    );

    return exportLambda;
  }

  private createAggregatorLambda(exportBucket: Bucket, analyticsTable: Table) {
    const aggregatorLambda = new NodejsFunction(this, 'AggregatorLambda', {
      entry: 'lib/analytics-lambda/aggregator.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      environment: {
        EXPORT_BUCKET: exportBucket.bucketName,
        ANALYTICS_TABLE: analyticsTable.tableName,
        S3_PREFIX: 'exports',
      },
    });

    // Grant S3 read permissions
    exportBucket.grantRead(aggregatorLambda);

    // Grant CloudWatch PutMetricData permissions
    aggregatorLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'], // CloudWatch API requires no resource restriction
      }),
    );

    // Grant DynamoDB write permissions to Analytics Table
    analyticsTable.grantWriteData(aggregatorLambda);

    return aggregatorLambda;
  }

  private createAnalyticsDashboard() {
    const dashboard = new Dashboard(this, 'AnalyticsDashboard', {
      dashboardName: 'BubblyClouds-Analytics',
    });

    // Create widget for ActiveUsers metric with SEARCH expression
    // Using wildcard dimension to auto-discover all App values
    const activeUsersWidget = new GraphWidget({
      title: 'Active Users by App',
      width: 12,
      height: 6,
      left: [
        new Metric({
          namespace: 'BubblyClouds/Analytics',
          metricName: 'ActiveUsers',
          statistic: 'Sum',
          period: Duration.days(1),
          region: 'eu-west-2',
        }),
      ],
      leftYAxis: {
        label: 'Users',
        showUnits: false,
      },
    });

    // Create widget for GamesPlayed metric with SEARCH expression
    const gamesPlayedWidget = new GraphWidget({
      title: 'Games Played by App',
      width: 12,
      height: 6,
      left: [
        new Metric({
          namespace: 'BubblyClouds/Analytics',
          metricName: 'GamesPlayed',
          statistic: 'Sum',
          period: Duration.days(1),
          region: 'eu-west-2',
        }),
      ],
      leftYAxis: {
        label: 'Games',
        showUnits: false,
      },
    });

    // Create widget for PartiesCreated metric with SEARCH expression
    const partiesCreatedWidget = new GraphWidget({
      title: 'Parties Created by App',
      width: 12,
      height: 6,
      left: [
        new Metric({
          namespace: 'BubblyClouds/Analytics',
          metricName: 'PartiesCreated',
          statistic: 'Sum',
          period: Duration.days(1),
          region: 'eu-west-2',
        }),
      ],
      leftYAxis: {
        label: 'Parties',
        showUnits: false,
      },
    });

    // Create widget for PartiesJoined metric with SEARCH expression
    const partiesJoinedWidget = new GraphWidget({
      title: 'Parties Joined by App',
      width: 12,
      height: 6,
      left: [
        new Metric({
          namespace: 'BubblyClouds/Analytics',
          metricName: 'PartiesJoined',
          statistic: 'Sum',
          period: Duration.days(1),
          region: 'eu-west-2',
        }),
      ],
      leftYAxis: {
        label: 'Joins',
        showUnits: false,
      },
    });

    // Add widgets to dashboard in a 2x2 grid layout
    dashboard.addWidgets(activeUsersWidget, gamesPlayedWidget);
    dashboard.addWidgets(partiesCreatedWidget, partiesJoinedWidget);
  }
}
