import { App } from '@/types/enums/app.enum';

export const validateApp = (app: string) =>
  Object.values(App).includes(app as App);
