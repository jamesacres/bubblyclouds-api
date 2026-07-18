import {
  BadRequestException,
  InternalServerErrorException,
  ArgumentsHost,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let superCatch: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  const host = {} as ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter({} as never);
    superCatch = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('warns for client HttpExceptions below 500 and delegates to super', () => {
    const exception = new BadRequestException('bad');
    filter.catch(exception, host);
    expect(warnSpy).toHaveBeenCalledWith(exception);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(superCatch).toHaveBeenCalledWith(exception, host);
  });

  it('errors for HttpExceptions of 500 and above', () => {
    const exception = new InternalServerErrorException('boom');
    filter.catch(exception, host);
    expect(errorSpy).toHaveBeenCalledWith(exception);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(superCatch).toHaveBeenCalledWith(exception, host);
  });

  it('errors for non-HttpException throwables', () => {
    const exception = new Error('unexpected');
    filter.catch(exception, host);
    expect(errorSpy).toHaveBeenCalledWith(exception);
    expect(superCatch).toHaveBeenCalledWith(exception, host);
  });
});
