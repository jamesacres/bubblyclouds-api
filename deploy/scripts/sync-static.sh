#!/usr/bin/env bash
#
# Uploads the static files in static/ to the S3 bucket the API Lambda reads
# from at runtime (currently the unblock race puzzle database).
#
# These files are committed to the repo but deliberately kept out of the CDK
# asset pipeline - static/unblock-race/puzzles.bin alone is ~19MB and would
# bloat every Lambda deployment - so they are pushed separately. Run this once
# after the first `npm run cdk:deploy`, and again whenever static/ changes.
#
#   npm run static:sync
#
# The bucket is resolved from $STATIC_BUCKET if set, otherwise from the
# CloudFormation stack output.

set -euo pipefail

STACK_NAME="${STACK_NAME:-ApiStack}"
OUTPUT_KEY="StaticBucketName"
STATIC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/static"

if [ ! -d "$STATIC_DIR" ]; then
  echo "error: $STATIC_DIR not found." >&2
  echo "       It is committed to the repo - check out the files before syncing." >&2
  exit 1
fi

BUCKET="${STATIC_BUCKET:-}"

if [ -z "$BUCKET" ]; then
  echo "Resolving bucket from CloudFormation stack '$STACK_NAME'..."
  BUCKET="$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$OUTPUT_KEY'].OutputValue" \
    --output text 2>/dev/null || true)"
fi

if [ -z "$BUCKET" ] || [ "$BUCKET" = "None" ]; then
  echo "error: could not resolve the static bucket name." >&2
  echo "       Deploy the stack first (npm run cdk:deploy), or set STATIC_BUCKET explicitly:" >&2
  echo "         STATIC_BUCKET=my-bucket npm run static:sync" >&2
  exit 1
fi

echo "Syncing $STATIC_DIR -> s3://$BUCKET/"

# `sync` compares size and modified time, so re-running once uploaded is a no-op.
aws s3 sync "$STATIC_DIR" "s3://$BUCKET/"

echo "Done. Static files available under s3://$BUCKET/"
