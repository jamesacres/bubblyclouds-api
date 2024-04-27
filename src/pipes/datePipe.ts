import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class DatePipe implements PipeTransform<any> {
  async transform(value: any) {
    if (typeof value === 'object') {
      if (typeof value.expiresAt === 'string') {
        value.expiresAt = new Date(value.expiresAt);
      }
    }
    return value;
  }
}
