import { App } from '@/types/enums/app.enum';
import { validateApp } from './validateApp';
import { BadRequestException } from '@nestjs/common';

export const splitAppModelId = (
  modelId: string,
): { app: App; appModelId: string } => {
  const [app, ...rest] = modelId.split('-');
  const appModelId = rest.join('-');
  if (!validateApp(app)) {
    throw new BadRequestException('Invalid app');
  }
  if (!appModelId.length) {
    throw new BadRequestException('Invalid app model');
  }
  return { appModelId: appModelId, app: app as App };
};
