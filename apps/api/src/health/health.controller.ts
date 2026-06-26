import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/index';

@ApiTags('health') @Controller('health')
export class HealthController {
  @Get() @Public() check() { return { status:'ok', uptime:process.uptime(), timestamp:new Date().toISOString() }; }
}
