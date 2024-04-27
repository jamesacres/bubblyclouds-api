import { App } from '@/types/enums/app.enum';
import { validateApp } from './validateApp';
import { BadRequestException } from '@nestjs/common';

export const splitSessionId = (
  sessionId: string,
): { app: App; appSessionId: string } => {
  const [app, ...rest] = sessionId.split('-');
  const appSessionId = rest.join('-');
  if (!validateApp(app)) {
    throw new BadRequestException('Invalid app');
  }
  if (!appSessionId.length) {
    throw new BadRequestException('Invalid app session');
  }
  return { appSessionId, app: app as App };
};
