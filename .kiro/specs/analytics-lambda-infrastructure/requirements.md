# Requirements Document

## Introduction

This document specifies the requirements for implementing analytics
infrastructure in the bubblyclouds-api CDK stack. The system will collect,
aggregate, and visualize usage metrics from the DynamoDB table using scheduled
Lambda functions, CloudWatch metrics, and a dedicated analytics table for
historical data storage.

## Glossary

- **Export_Lambda**: Scheduled Lambda function that triggers DynamoDB
  incremental PITR export to S3
- **Aggregator_Lambda**: Scheduled Lambda function that reads S3 exports,
  aggregates metrics, and publishes to CloudWatch
- **Analytics_Table**: DynamoDB table storing per-user daily metric breakdowns
  with 455-day TTL
- **Main_Table**: The existing ApiTable with single-table design containing
  sessions, parties, members, and users
- **CloudWatch_Dashboard**: AWS CloudWatch dashboard displaying metrics with
  auto-discovered app dimensions
- **Export_Bucket**: S3 bucket for temporary storage of DynamoDB export files
- **PITR**: Point-in-Time Recovery, DynamoDB feature enabling incremental
  exports without table capacity impact
- **Backfill_Mode**: Operation mode for processing historical data from a start
  date to yesterday using full export
- **Incremental_Mode**: Daily operation mode processing only the previous day's
  data using incremental export
- **Target_Day**: The specific date being processed for metrics aggregation
  (yesterday in incremental mode)

## Requirements

### Requirement 1: DynamoDB Export Lambda Function

**User Story:** As a system operator, I want automated DynamoDB exports to S3,
so that I can process table data without impacting production capacity.

#### Acceptance Criteria

1. WHEN the Export_Lambda executes at 2:00 AM UTC daily, THE Export_Lambda SHALL
   trigger an incremental PITR export of Main_Table to Export_Bucket
2. WHEN running in incremental mode, THE Export_Lambda SHALL export only data
   modified since the previous export
3. WHEN running in backfill mode, THE Export_Lambda SHALL trigger a full table
   export
4. THE Export_Lambda SHALL have a 30-second timeout and 128 MB memory allocation
5. THE Export_Lambda SHALL use Node.js 20.x runtime
6. THE Export_Lambda SHALL have IAM permissions to execute
   ExportTableToPointInTime on Main_Table
7. THE Export_Lambda SHALL have IAM permissions to write to Export_Bucket

### Requirement 2: Metrics Aggregation Lambda Function

**User Story:** As a system operator, I want automated metrics aggregation from
DynamoDB exports, so that I can track application usage without manual
processing.

#### Acceptance Criteria

1. WHEN the Aggregator_Lambda executes at 2:30 AM UTC daily, THE
   Aggregator_Lambda SHALL read the completed DynamoDB export from Export_Bucket
2. WHEN processing export data in incremental mode, THE Aggregator_Lambda SHALL
   aggregate metrics for the Target_Day (yesterday)
3. WHEN processing export data in backfill mode, THE Aggregator_Lambda SHALL
   aggregate metrics for all days from the start date to yesterday
4. THE Aggregator_Lambda SHALL have a 5-minute timeout and 256 MB memory
   allocation
5. THE Aggregator_Lambda SHALL use Node.js 20.x runtime
6. THE Aggregator_Lambda SHALL have IAM permissions to read from Export_Bucket
7. THE Aggregator_Lambda SHALL have IAM permissions to publish metrics to
   CloudWatch
8. THE Aggregator_Lambda SHALL have IAM permissions to write to Analytics_Table

### Requirement 3: Active Users Metric

**User Story:** As a product manager, I want to track daily active users per
app, so that I can understand user engagement patterns.

#### Acceptance Criteria

1. WHEN aggregating metrics for a Target_Day, THE Aggregator_Lambda SHALL
   identify all session records where the updatedAt timestamp falls within the
   Target_Day
2. WHEN counting active users, THE Aggregator_Lambda SHALL extract distinct user
   IDs from session records with modelId pattern "session-{app}-{id}"
3. WHEN publishing the ActiveUsers metric, THE Aggregator_Lambda SHALL use the
   App dimension extracted from the session modelId
4. WHEN publishing the ActiveUsers metric, THE Aggregator_Lambda SHALL set the
   timestamp to the start of the Target_Day (00:00:00 UTC)
5. WHEN storing active users in Analytics_Table, THE Aggregator_Lambda SHALL
   store the complete list of user IDs in the activeUserIds attribute

### Requirement 4: Games Played Metric

**User Story:** As a product manager, I want to track the number of games played
per app daily, so that I can measure application usage intensity.

#### Acceptance Criteria

1. WHEN aggregating metrics for a Target_Day, THE Aggregator_Lambda SHALL count
   all session records where the updatedAt timestamp falls within the Target_Day
2. WHEN counting games played, THE Aggregator_Lambda SHALL include all records
   with modelId pattern "session-{app}-{id}"
3. WHEN publishing the GamesPlayed metric, THE Aggregator_Lambda SHALL use the
   App dimension extracted from the session modelId
4. WHEN publishing the GamesPlayed metric, THE Aggregator_Lambda SHALL set the
   timestamp to the start of the Target_Day (00:00:00 UTC)
5. WHEN storing games played in Analytics_Table, THE Aggregator_Lambda SHALL
   store per-user game counts in the gamesPerUser attribute

### Requirement 5: Parties Created Metric

**User Story:** As a product manager, I want to track the number of parties
created per app daily, so that I can understand social feature adoption.

#### Acceptance Criteria

1. WHEN aggregating metrics for a Target_Day, THE Aggregator_Lambda SHALL count
   all party records where the createdAt timestamp falls within the Target_Day
2. WHEN counting parties created, THE Aggregator_Lambda SHALL include all
   records with modelId pattern "party-{app}-{id}"
3. WHEN publishing the PartiesCreated metric, THE Aggregator_Lambda SHALL use
   the App dimension extracted from the party modelId
4. WHEN publishing the PartiesCreated metric, THE Aggregator_Lambda SHALL set
   the timestamp to the start of the Target_Day (00:00:00 UTC)
5. WHEN storing parties created in Analytics_Table, THE Aggregator_Lambda SHALL
   store per-user party creation counts in the partiesCreatedPerUser attribute

### Requirement 6: Parties Joined Metric

**User Story:** As a product manager, I want to track the number of party joins
per app daily, so that I can measure social engagement.

#### Acceptance Criteria

1. WHEN aggregating metrics for a Target_Day, THE Aggregator_Lambda SHALL count
   all member records where the createdAt timestamp falls within the Target_Day
2. WHEN counting parties joined, THE Aggregator_Lambda SHALL extract the app
   identifier from the owner attribute with pattern "party-{app}-{id}"
3. WHEN publishing the PartiesJoined metric, THE Aggregator_Lambda SHALL use the
   App dimension extracted from the member owner attribute
4. WHEN publishing the PartiesJoined metric, THE Aggregator_Lambda SHALL set the
   timestamp to the start of the Target_Day (00:00:00 UTC)
5. WHEN storing parties joined in Analytics_Table, THE Aggregator_Lambda SHALL
   store the total count in the partiesJoined attribute

### Requirement 7: Analytics DynamoDB Table

**User Story:** As a system operator, I want persistent storage of daily
analytics data, so that I can query historical metrics and maintain data beyond
CloudWatch retention.

#### Acceptance Criteria

1. THE Analytics_Table SHALL use "date" (YYYY-MM-DD format) as the partition key
2. THE Analytics_Table SHALL use "app" as the sort key
3. THE Analytics_Table SHALL store activeUserIds as an array attribute
4. THE Analytics_Table SHALL store gamesPerUser as a map attribute with user IDs
   as keys and counts as values
5. THE Analytics_Table SHALL store partiesCreatedPerUser as a map attribute with
   user IDs as keys and counts as values
6. THE Analytics_Table SHALL store partiesJoined as a number attribute
7. THE Analytics_Table SHALL store summary as a map attribute containing
   aggregate totals
8. THE Analytics_Table SHALL have an expiresAt attribute for TTL functionality
9. THE Analytics_Table SHALL be configured with 1 RCU and 1 WCU (minimum
   provisioned capacity)
10. THE Analytics_Table SHALL have TTL enabled with 455-day expiration to match
    CloudWatch retention

### Requirement 8: S3 Export Bucket

**User Story:** As a system operator, I want temporary storage for DynamoDB
exports, so that the Aggregator_Lambda can process table data efficiently.

#### Acceptance Criteria

1. THE Export_Bucket SHALL be created in the eu-west-2 region
2. THE Export_Bucket SHALL have a lifecycle policy that expires objects after 1
   day
3. THE Export_Bucket SHALL be configured for automatic deletion when the CDK
   stack is removed
4. THE Export_Bucket SHALL grant write permissions to the DynamoDB export
   service
5. THE Export_Bucket SHALL grant read permissions to Aggregator_Lambda

### Requirement 9: CloudWatch Dashboard

**User Story:** As a product manager, I want a visual dashboard of application
metrics, so that I can monitor usage trends without writing custom queries.

#### Acceptance Criteria

1. THE CloudWatch_Dashboard SHALL display all four metrics (ActiveUsers,
   GamesPlayed, PartiesCreated, PartiesJoined)
2. WHEN displaying metrics, THE CloudWatch_Dashboard SHALL use SEARCH
   expressions to auto-discover all App dimension values
3. THE CloudWatch_Dashboard SHALL display metrics with 455-day retention
4. THE CloudWatch_Dashboard SHALL be created in the eu-west-2 region
5. THE CloudWatch_Dashboard SHALL organize metrics in a readable layout with
   appropriate time ranges

### Requirement 10: Scheduled Execution

**User Story:** As a system operator, I want automated daily execution of
analytics processing, so that metrics are updated without manual intervention.

#### Acceptance Criteria

1. THE Export_Lambda SHALL be triggered by an EventBridge rule at 2:00 AM UTC
   daily
2. THE Aggregator_Lambda SHALL be triggered by an EventBridge rule at 2:30 AM
   UTC daily
3. THE system SHALL ensure a 30-minute gap between Export_Lambda and
   Aggregator_Lambda execution to allow export completion
4. WHEN the CDK stack is deployed, THE EventBridge rules SHALL be enabled by
   default

### Requirement 11: Backfill Capability

**User Story:** As a system operator, I want to backfill historical analytics
data from January 17, 2025, so that I can populate metrics for days before the
analytics system was deployed.

#### Acceptance Criteria

1. WHEN running in backfill mode, THE Export_Lambda SHALL trigger a full table
   export instead of an incremental export
2. WHEN running in backfill mode, THE Aggregator_Lambda SHALL process all
   records and aggregate metrics for each day from January 17, 2025 to yesterday
3. WHEN aggregating in backfill mode, THE Aggregator_Lambda SHALL group records
   by date based on their respective timestamp attributes (updatedAt for
   sessions, createdAt for parties and members)
4. WHEN writing backfill data, THE Aggregator_Lambda SHALL write one
   Analytics_Table record per app per day
5. WHEN publishing backfill metrics, THE Aggregator_Lambda SHALL publish
   CloudWatch metrics for each day with the appropriate timestamp

### Requirement 12: IAM Permissions and Security

**User Story:** As a security engineer, I want least-privilege IAM permissions
for all components, so that the system follows security best practices.

#### Acceptance Criteria

1. THE Export_Lambda SHALL have IAM permissions scoped to the specific
   Main_Table ARN for dynamodb:ExportTableToPointInTime
2. THE Export_Lambda SHALL have IAM permissions scoped to the specific
   Export_Bucket ARN for s3:PutObject
3. THE Aggregator_Lambda SHALL have IAM permissions scoped to the specific
   Export_Bucket ARN for s3:GetObject and s3:ListBucket
4. THE Aggregator_Lambda SHALL have IAM permissions for cloudwatch:PutMetricData
   with no resource restrictions (CloudWatch API requirement)
5. THE Aggregator_Lambda SHALL have IAM permissions scoped to the specific
   Analytics_Table ARN for dynamodb:PutItem
6. THE system SHALL NOT grant any permissions beyond those explicitly required
   for functionality

### Requirement 13: Cost Optimization

**User Story:** As a system operator, I want cost-efficient analytics
infrastructure, so that monitoring costs remain predictable and minimal.

#### Acceptance Criteria

1. THE Export_Lambda SHALL use incremental PITR exports to avoid consuming
   Main_Table read capacity
2. THE Analytics_Table SHALL use minimum provisioned capacity (1 RCU, 1 WCU)
   since access patterns are write-once, read-rarely
3. THE Export_Bucket SHALL automatically delete export files after 1 day to
   minimize storage costs
4. THE system SHALL have a total estimated monthly cost of approximately $3.65
   (primarily CloudWatch dashboard at $3/month)
5. THE system SHALL NOT introduce any charges to Main_Table read/write capacity
   units

### Requirement 14: Error Handling and Monitoring

**User Story:** As a system operator, I want visibility into analytics
processing failures, so that I can troubleshoot issues quickly.

#### Acceptance Criteria

1. WHEN the Export_Lambda fails, THE Export_Lambda SHALL log detailed error
   information to CloudWatch Logs
2. WHEN the Aggregator_Lambda fails, THE Aggregator_Lambda SHALL log detailed
   error information to CloudWatch Logs
3. THE Export_Lambda SHALL have CloudWatch Logs retention set to a reasonable
   period for troubleshooting
4. THE Aggregator_Lambda SHALL have CloudWatch Logs retention set to a
   reasonable period for troubleshooting
5. WHEN the Aggregator_Lambda encounters malformed export data, THE
   Aggregator_Lambda SHALL log the error and continue processing remaining
   records
