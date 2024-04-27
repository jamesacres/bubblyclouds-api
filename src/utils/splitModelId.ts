import { Model } from '@/types/enums/model';
import { BadRequestException } from '@nestjs/common';

export const splitModelId = (id: string): [type: Model, id: string] => {
  const [type, ...rest] = id.split('-');
  if (!Object.values(Model).includes(type as Model)) {
    throw new BadRequestException(`Unsupported type ${type}`);
  }
  return [type as Model, rest.join('-')];
};
