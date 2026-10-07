import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AssistantError,
  AssistantRateLimitedError,
} from '../../domain/errors.js';

/** Maps each domain error to its HTTP status: the only place that knows about both. */
export function statusOf(error: AssistantError): HttpStatus {
  return error instanceof AssistantRateLimitedError
    ? HttpStatus.TOO_MANY_REQUESTS
    : HttpStatus.SERVICE_UNAVAILABLE;
}

@Catch(AssistantError)
export class AssistantErrorFilter implements ExceptionFilter<AssistantError> {
  catch(error: AssistantError, host: ArgumentsHost): void {
    const status = statusOf(error);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message });
  }
}
