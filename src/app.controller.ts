import { Controller, Get, Redirect } from '@nestjs/common';

const PORTFOLIO_CHAT_URL = 'https://optickal095.github.io/portfolio/#pregunta';

@Controller()
export class AppController {
  /** The API has no UI of its own; visitors land on the chat in the portfolio. */
  @Get()
  @Redirect(PORTFOLIO_CHAT_URL, 302)
  root(): void {}

  /** Cheap endpoint the portfolio calls on load to wake the server up. */
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
