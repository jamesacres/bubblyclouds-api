# Analytics Backfill Guide

This guide explains how to backfill historical analytics data from January 17,
2025 to populate metrics for days before the analytics system was deployed.

## Overview

The analytics system supports two operation modes:

- **Incremental Mode** (default): Processes only yesterday's data using
  incremental DynamoDB exports
- **Backfill Mode**: Processes all historical data from a specified start date
  to yesterday using a full table export

Backfill mode allows you to populate historical metrics by processing all
records in the main DynamoDB table and aggregating them by date.

## Prerequisites

- AWS CLI configured with appropriate credentials
- IAM permissions to invoke Lambda functions
- Access to the deployed analytics infrastructure stack

## Backfill Process

The backfill process consists of two steps:

1. **Export Lambda**: Triggers a full table export to S3
2. **Aggregator Lambda**: Processes the export and aggregates metrics for each
   day from the start date to yesterday

### Step 1: Trigger Export Lambda in Backfill Mode

The Export Lambda must be invoked with backfill mode to trigger a full table
export instead of an incremental export.

**AWS CLI Command:**

```bash
aws lambda invoke \
  --function-name <STACK_NAME>-ExportLambda \
  --payload '{"mode":"backfill","backfillStartDate":"2025-01-17"}' \
  --region eu-west-2 \
  response.json
```

**Parameters:**

- `mode`: Must be `"backfill"`
- `backfillStartDate`: ISO date string (YYYY-MM-DD) for the earliest date to
  include in the backfill

**Expected Response:**

```json
{
  "StatusCode": 200,
  "ExecutedVersion": "$LATEST"
}
```

The Lambda function will initiate a full DynamoDB export to S3. This is an
asynchronous operation that continues after the Lambda completes.

### Step 2: Wait for Export Completion

The full table export takes time to complete. Monitor the export status:

**Check CloudWatch Logs:**

```bash
aws logs tail /aws/lambda/<STACK_NAME>-ExportLambda \
  --region eu-west-2 \
  --follow
```

Look for log messages indicating the export was initiated successfully. The
export ARN will be logged.

**Check Export Status via AWS Console:**

1. Navigate to DynamoDB → Exports to S3
2. Find the export by ARN (from CloudWatch logs)
3. Wait for status to change from `IN_PROGRESS` to `COMPLETED`

**Typical Export Duration:**

- Small tables (<1GB): 5-15 minutes
- Medium tables (1-10GB): 15-60 minutes
- Large tables (>10GB): 1-3 hours

### Step 3: Trigger Aggregator Lambda in Backfill Mode

Once the export is complete, invoke the Aggregator Lambda to process the data.

**AWS CLI Command:**

```bash
aws lambda invoke \
  --function-name <STACK_NAME>-AggregatorLambda \
  --payload '{"mode":"backfill","backfillStartDate":"2025-01-17"}' \
  --region eu-west-2 \
  response.json
```

**Parameters:**

- `mode`: Must be `"backfill"`
- `backfillStartDate`: Same date as used in Step 1 (YYYY-MM-DD)

**Expected Response:**

```json
{
  "StatusCode": 200,
  "ExecutedVersion": "$LATEST"
}
```

The Aggregator Lambda will:

1. Read the latest export from S3
2. Process all records and aggregate metrics by date and app
3. Publish CloudWatch metrics for each day from the start date to yesterday
4. Write detailed records to the Analytics Table

### Step 4: Monitor Aggregation Progress

**Check CloudWatch Logs:**

```bash
aws logs tail /aws/lambda/<STACK_NAME>-AggregatorLambda \
  --region eu-west-2 \
  --follow
```

Look for progress messages:

- "Processing data files..."
- "Processed X items so far..." (logged every 1000 items)
- "Aggregation complete"
- "Publishing metrics to CloudWatch..."
- "Writing records to Analytics Table..."
- "Aggregator Lambda completed successfully"

**Typical Aggregation Duration:**

- Small datasets (<10k records): 10-30 seconds
- Medium datasets (10k-100k records): 30-120 seconds
- Large datasets (>100k records): 2-5 minutes

The Lambda has a 5-minute timeout, which should be sufficient for most
workloads.

## Verification

After the backfill completes, verify the results:

### 1. Check Analytics Table

Query the Analytics Table to verify records were written:

```bash
aws dynamodb scan \
  --table-name <STACK_NAME>-AnalyticsTable \
  --region eu-west-2 \
  --max-items 10
```

You should see records with dates ranging from your backfill start date to
yesterday.

### 2. Check CloudWatch Metrics

Navigate to CloudWatch → Metrics → BubblyClouds/Analytics in the AWS Console.

You should see metrics for:

- ActiveUsers
- GamesPlayed
- PartiesCreated
- PartiesJoined

Each metric should have data points for each day from the backfill start date to
yesterday, with the App dimension showing all discovered apps.

### 3. Check CloudWatch Dashboard

Navigate to CloudWatch → Dashboards → <STACK_NAME>-AnalyticsDashboard.

The dashboard should display all four metrics with historical data visible in
the time range selector.

## Cost Estimates

Backfill operations incur AWS costs:

### DynamoDB Export Costs

- **Full Export**: $0.10 per GB of table size
- Example: 10 GB table = $1.00

### S3 Storage Costs

- **Storage**: $0.023 per GB-month (eu-west-2)
- **Lifecycle**: Exports are automatically deleted after 1 day
- Example: 10 GB export stored for 1 day = $0.0008

### Lambda Execution Costs

- **Export Lambda**: Minimal (completes in <1 second)
- **Aggregator Lambda**: $0.0000166667 per GB-second
- Example: 256 MB for 2 minutes = $0.0005

### CloudWatch Metrics Costs

- **Custom Metrics**: $0.30 per metric per month (first 10,000 metrics)
- **Backfill**: One-time publishing of historical data points (no additional
  cost beyond standard metric storage)

### Total Estimated Cost

For a typical backfill of a 10 GB table with 30 days of historical data:

- DynamoDB Export: $1.00
- S3 Storage: $0.001
- Lambda Execution: $0.001
- **Total: ~$1.00**

## Troubleshooting

### Export Lambda Fails

**Error: "TABLE_NAME environment variable is required"**

- The Lambda function is not properly configured
- Verify the CDK stack deployed successfully

**Error: "Invalid mode. Must be 'incremental' or 'backfill'"**

- Check the payload JSON syntax
- Ensure `mode` is set to `"backfill"`

**Error: "backfillStartDate is required for backfill mode"**

- Add the `backfillStartDate` parameter to the payload
- Format: `"YYYY-MM-DD"`

**Error: "Access Denied" or "User is not authorized"**

- Verify IAM permissions for `dynamodb:ExportTableToPointInTime`
- Verify IAM permissions for `s3:PutObject` on the export bucket

### Aggregator Lambda Fails

**Error: "EXPORT_BUCKET environment variable is required"**

- The Lambda function is not properly configured
- Verify the CDK stack deployed successfully

**Error: "Invalid backfillStartDate format"**

- Ensure the date is in YYYY-MM-DD format
- Example: `"2025-01-17"`

**Error: "No export found in S3"**

- Verify the Export Lambda completed successfully
- Verify the export status is `COMPLETED` in DynamoDB console
- Check that the S3 bucket contains the export files

**Error: "Task timed out after 300.00 seconds"**

- The dataset is too large for the 5-minute timeout
- Consider increasing the Lambda timeout in the CDK stack
- Or process the backfill in smaller date ranges

### Incomplete Data

**Missing dates in Analytics Table:**

- Verify the backfillStartDate is correct
- Check CloudWatch logs for errors during processing
- Verify the main table contains data for those dates

**Missing apps in CloudWatch metrics:**

- Verify the main table contains records for those apps
- Check that the modelId patterns match expected format (session-{app}-{id},
  party-{app}-{id})
- Review CloudWatch logs for malformed record warnings

## Re-running Backfill

The backfill process is idempotent. Re-running the Aggregator Lambda will
overwrite existing Analytics Table records for the same date and app
combinations.

To re-run a backfill:

1. **Skip Export Lambda** if the export is still available in S3 (within 1 day)
2. **Re-invoke Aggregator Lambda** with the same parameters

If the export has been deleted (after 1 day), start from Step 1.

## Incremental Updates After Backfill

After completing the backfill, the scheduled EventBridge rules will
automatically process new data daily:

- **2:00 AM UTC**: Export Lambda runs in incremental mode
- **2:30 AM UTC**: Aggregator Lambda runs in incremental mode

No manual intervention is required for ongoing daily analytics.

## Support

For issues or questions:

1. Check CloudWatch Logs for detailed error messages
2. Verify IAM permissions and environment variables
3. Review the Analytics Lambda Infrastructure design document
4. Contact the infrastructure team for assistance
