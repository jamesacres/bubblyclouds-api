import { build } from './app.build';
import express from 'express';

async function bootstrap() {
  const expressApp = express();
  const app = await build(expressApp);
  await app.listen(3000);
}
bootstrap();
