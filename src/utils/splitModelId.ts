import { Model } from '@/types/enums/model';

export const splitModelId = (id: string): [type: Model, id: string] => {
  const [type, ...rest] = id.split('-');
  if (!Object.values(Model).includes(type as Model)) {
    throw Error(`Unsupported type ${type}`);
  }
  return [type as Model, rest.join('-')];
};
