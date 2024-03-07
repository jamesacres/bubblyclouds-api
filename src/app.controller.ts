import { Controller, Get, HttpStatus, Redirect } from '@nestjs/common';
import { ApiMovedPermanentlyResponse, ApiOkResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  @ApiMovedPermanentlyResponse()
  @Redirect('https://bubblyclouds.com', HttpStatus.MOVED_PERMANENTLY)
  index() {}

  @Get('/health')
  @ApiOkResponse()
  health() {
    return { ok: true };
  }
}
