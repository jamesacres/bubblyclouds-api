import { Controller, Get, HttpStatus, Redirect } from '@nestjs/common';
import { ApiMovedPermanentlyResponse, ApiOkResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@Controller()
export class AppController {
  constructor() {}

  @Public()
  @Get()
  @ApiMovedPermanentlyResponse()
  @Redirect('https://bubblyclouds.com', HttpStatus.MOVED_PERMANENTLY)
  index() {}

  @Public()
  @Get('/health')
  @ApiOkResponse()
  health() {
    return { ok: true };
  }
}
