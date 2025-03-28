// This file was created by Nest CLI. It serves no significant purose. I chose to leave this file as it is because I did not want to change the default structure of the CLI generated files. This file can be deleted.

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a greeting message' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
