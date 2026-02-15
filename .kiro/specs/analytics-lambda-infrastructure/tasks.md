# Implementation Plan: Analytics Lambda Infrastructure

## Overview

This implementation plan breaks down the analytics infrastructure into discrete
coding tasks. The approach follows a bottom-up strategy: first creating the
Lambda function implementations, then adding the CDK infrastructure to deploy
them, and finally wiring everything together with EventBridge rules and the
CloudWatch dashboard.

## Tasks

-
  1. [ ] Create Lambda function source files and shared utilities
  - [x] 1.1 Create directory structure for Lambda functions
    - Create `deploy/lib/analytics-lambda/` directory for Lambda code (separate
      from NestJS app)
    - Create `deploy/lib/analytics-lambda/shared/` for shared utilities
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 Implement shared utility functions
    - Create `deploy/lib/analytics-lambda/shared/date-utils.ts` with date
      formatting and validation functions
    - Create `deploy/lib/analytics-lambda/shared/pattern-utils.ts` with modelId
      and owner pattern extraction functions
    - Create `deploy/lib/analytics-lambda/shared/types.ts` with shared
      TypeScript interfaces
    - _Requirements: 3.3, 3.4, 6.2, 11.3_

  - [ ]* 1.3 Write property tests for shared utilities
    - **Property 3: App extraction from modelId**
    - **Property 4: Metric timestamp formatting**
    - **Property 12: App extraction from member owner attribute**
    - **Property 14: Timestamp field selection by record type**
    - _Requirements: 3.3, 3.4, 6.2, 11.3_

-
  2. [ ] Implement Export Lambda function
  - [x] 2.1 Create Export Lambda handler
    - Create `deploy/lib/analytics-lambda/export-trigger.ts` with main handler
      function
    - Implement environment variable validation
    - Implement export parameter construction for incremental mode
    - Implement export parameter construction for backfill mode
    - Call DynamoDB ExportTableToPointInTime API
    - Add error handling and logging
    - _Requirements: 1.1, 1.2, 1.3, 14.1_

  - [ ]* 2.2 Write unit tests for Export Lambda
    - Test incremental mode parameter construction
    - Test backfill mode parameter construction
    - Test environment variable validation
    - Test error handling
    - _Requirements: 1.1, 1.2, 1.3, 14.1_

-
  3. [ ] Implement Aggregator Lambda core logic
  - [x] 3.1 Create S3 export reader
    - Create `deploy/lib/analytics-lambda/s3-reader.ts`
    - Implement function to find latest export in S3
    - Implement function to read export manifest
    - Implement function to read and parse data files
    - Add error handling for S3 operations
    - _Requirements: 2.1, 14.2, 14.5_

  - [x] 3.2 Create metrics aggregation engine
    - Create `deploy/lib/analytics-lambda/aggregator-core.ts`
    - Implement data structures for tracking metrics by date and app
    - Implement session record processing (active users and games played)
    - Implement party record processing (parties created)
    - Implement member record processing (parties joined)
    - Implement date filtering for incremental vs backfill mode
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.5, 5.1, 5.2, 5.5, 6.1, 6.5,
      11.2, 11.3_

  - [ ]* 3.3 Write property tests for metrics aggregation
    - **Property 1: Session date filtering**
    - **Property 2: Distinct user ID extraction from sessions**
    - **Property 6: Session pattern matching**
    - **Property 7: Per-user game count aggregation**
    - **Property 8: Party date filtering**
    - **Property 9: Party pattern matching**
    - **Property 10: Per-user party creation count aggregation**
    - **Property 11: Member date filtering**
    - **Property 13: Parties joined count aggregation**
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.5, 5.1, 5.2, 5.5, 6.1, 6.5_

  - [x] 3.4 Create CloudWatch metrics publisher
    - Create `deploy/lib/analytics-lambda/cloudwatch-publisher.ts`
    - Implement function to build CloudWatch metric data
    - Implement function to publish metrics to CloudWatch
    - Add error handling for CloudWatch operations
    - _Requirements: 2.7, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4, 6.3, 6.4, 11.5_

  - [ ]* 3.5 Write property tests for CloudWatch publisher
    - **Property 5: Active user IDs storage completeness**
    - **Property 16: Backfill metric timestamp distribution**
    - _Requirements: 3.5, 11.5_

  - [x] 3.6 Create Analytics Table writer
    - Create `deploy/lib/analytics-lambda/analytics-writer.ts`
    - Implement function to build Analytics_Table record structure
    - Implement TTL calculation (455 days)
    - Implement function to write records to DynamoDB
    - Add error handling for DynamoDB operations
    - _Requirements: 2.8, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10, 11.4_

  - [ ]* 3.7 Write property tests for Analytics Table writer
    - **Property 15: Analytics record partitioning**
    - _Requirements: 11.4_

  - [ ]* 3.8 Write unit tests for Analytics Table writer
    - Test record structure matches schema
    - Test TTL calculation
    - Test error handling
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10_

  - [x] 3.9 Create Aggregator Lambda handler
    - Create `deploy/lib/analytics-lambda/aggregator.ts` with main handler
      function
    - Wire together S3 reader, aggregator, CloudWatch publisher, and Analytics
      writer
    - Implement environment variable validation
    - Implement mode-based processing (incremental vs backfill)
    - Add comprehensive error handling and logging
    - _Requirements: 2.1, 2.2, 2.3, 14.2, 14.5_

  - [ ]* 3.10 Write unit tests for Aggregator Lambda handler
    - Test environment variable validation
    - Test incremental mode flow
    - Test backfill mode flow
    - Test error handling for malformed records
    - _Requirements: 2.2, 2.3, 14.2, 14.5_

-
  4. [ ] Checkpoint - Ensure Lambda function tests pass
  - Ensure all tests pass, ask the user if questions arise.

-
  5. [ ] Add CDK infrastructure for Analytics Table and S3 bucket
  - [x] 5.1 Create Analytics DynamoDB Table in CDK
    - Add Analytics_Table to `deploy/lib/api-stack.ts`
    - Configure partition key (date) and sort key (app)
    - Configure TTL attribute (expiresAt)
    - Configure provisioned capacity (1 RCU, 1 WCU)
    - Return table reference for Lambda permissions
    - _Requirements: 7.1, 7.2, 7.9, 7.10_

  - [x] 5.2 Create S3 Export Bucket in CDK
    - Add Export_Bucket to `deploy/lib/api-stack.ts`
    - Configure lifecycle policy (1-day expiration)
    - Configure removal policy (destroy)
    - Configure region (eu-west-2)
    - Return bucket reference for Lambda permissions
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 5.3 Write CDK unit tests for table and bucket
    - Test Analytics_Table schema
    - Test Analytics_Table capacity
    - Test Analytics_Table TTL configuration
    - Test Export_Bucket lifecycle policy
    - Test Export_Bucket removal policy
    - _Requirements: 7.1, 7.2, 7.9, 7.10, 8.2, 8.3_

-
  6. [ ] Add CDK infrastructure for Lambda functions
  - [x] 6.1 Create Export Lambda in CDK
    - Add Export Lambda using NodejsFunction construct
    - Configure runtime (Node.js 20.x), memory (128 MB), timeout (30s)
    - Set environment variables (TABLE_ARN, BUCKET_NAME, S3_PREFIX)
    - Configure entry point to `deploy/lib/analytics-lambda/export-trigger.ts`
    - Add CloudWatch Logs retention
    - _Requirements: 1.4, 1.5, 14.3_

  - [x] 6.2 Add IAM permissions for Export Lambda
    - Grant dynamodb:ExportTableToPointInTime on Main_Table
    - Grant s3:PutObject and s3:AbortMultipartUpload on Export_Bucket
    - Scope permissions to specific resource ARNs
    - _Requirements: 1.6, 1.7, 12.1, 12.2_

  - [x] 6.3 Create Aggregator Lambda in CDK
    - Add Aggregator Lambda using NodejsFunction construct
    - Configure runtime (Node.js 20.x), memory (256 MB), timeout (5 minutes)
    - Set environment variables (TABLE_ARN, ANALYTICS_TABLE_NAME, BUCKET_NAME,
      S3_PREFIX)
    - Configure entry point to `deploy/lib/analytics-lambda/aggregator.ts`
    - Add CloudWatch Logs retention
    - _Requirements: 2.4, 2.5, 14.4_

  - [x] 6.4 Add IAM permissions for Aggregator Lambda
    - Grant s3:GetObject and s3:ListBucket on Export_Bucket
    - Grant cloudwatch:PutMetricData (no resource restriction)
    - Grant dynamodb:PutItem on Analytics_Table
    - Scope permissions to specific resource ARNs where applicable
    - _Requirements: 2.6, 2.7, 2.8, 12.3, 12.4, 12.5_

  - [ ]* 6.5 Write CDK unit tests for Lambda functions
    - Test Export Lambda configuration (runtime, memory, timeout)
    - Test Aggregator Lambda configuration (runtime, memory, timeout)
    - Test Export Lambda IAM permissions
    - Test Aggregator Lambda IAM permissions
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 2.4, 2.5, 2.6, 2.7, 2.8, 12.1, 12.2,
      12.3, 12.4, 12.5_

-
  7. [ ] Add EventBridge rules for scheduled execution
  - [x] 7.1 Create EventBridge rule for Export Lambda
    - Add EventBridge Rule to `deploy/lib/api-stack.ts`
    - Configure cron schedule (0 2 * * ? * - 2:00 AM UTC)
    - Set Export Lambda as target
    - Configure input payload with mode: "incremental"
    - _Requirements: 10.1, 10.4_

  - [x] 7.2 Create EventBridge rule for Aggregator Lambda
    - Add EventBridge Rule to `deploy/lib/api-stack.ts`
    - Configure cron schedule (30 2 * * ? * - 2:30 AM UTC)
    - Set Aggregator Lambda as target
    - Configure input payload with mode: "incremental"
    - _Requirements: 10.2, 10.4_

  - [ ]* 7.3 Write CDK unit tests for EventBridge rules
    - Test Export rule schedule (2:00 AM UTC)
    - Test Aggregator rule schedule (2:30 AM UTC)
    - Test 30-minute gap between schedules
    - Test rule targets and input payloads
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

-
  8. [ ] Add CloudWatch Dashboard
  - [x] 8.1 Create CloudWatch Dashboard in CDK
    - Add CloudWatch Dashboard to `deploy/lib/api-stack.ts`
    - Create widget for ActiveUsers metric with SEARCH expression
    - Create widget for GamesPlayed metric with SEARCH expression
    - Create widget for PartiesCreated metric with SEARCH expression
    - Create widget for PartiesJoined metric with SEARCH expression
    - Configure region (eu-west-2)
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]* 8.2 Write CDK unit tests for CloudWatch Dashboard
    - Test dashboard includes all four metrics
    - Test dashboard uses SEARCH expressions
    - _Requirements: 9.1, 9.2_

-
  9. [ ] Add backfill capability documentation
  - [x] 9.1 Create backfill execution guide
    - Create `docs/analytics-backfill.md` with instructions
    - Document how to invoke Export Lambda in backfill mode
    - Document how to invoke Aggregator Lambda in backfill mode
    - Document expected execution time and costs
    - Include example AWS CLI commands
    - _Requirements: 11.1, 11.2_

-
  10. [ ] Final checkpoint - Ensure all tests pass and infrastructure deploys
  - Run all unit tests and property tests
  - Run CDK synth to validate infrastructure
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Lambda function code should be created before CDK infrastructure
- Property tests validate universal correctness properties across randomized
  inputs
- Unit tests validate specific examples, edge cases, and infrastructure
  configuration
- The implementation uses NodejsFunction from aws-cdk-lib/aws-lambda-nodejs for
  automatic bundling
- Backfill mode is invoked manually, not through EventBridge schedules
