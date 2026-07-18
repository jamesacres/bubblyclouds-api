import serverlessExpress from '@codegenie/serverless-express';
import { Context, Handler } from 'aws-lambda';
import express from 'express';

import { build } from './app.build';

let cachedServer: Handler;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const nestApp = await build(expressApp);
    await nestApp.init();

    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer;
}

const handler = async (event: any, context: Context) => {
  const server = await bootstrap();
  // serverless-express returns a promise-based handler. The Node.js 24 Lambda
  // runtime rejects callback-style handlers, so return the promise rather than
  // passing a callback through.
  return server(event, context, () => undefined);
};

module.exports.handler = handler;
