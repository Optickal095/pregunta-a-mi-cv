import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /** Cheap endpoint the portfolio calls on load to wake the server up. */
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
