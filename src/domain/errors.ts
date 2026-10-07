/**
 * Failures the assistant can report. They say what went wrong in business
 * terms; the HTTP layer decides which status code each one becomes.
 */
export abstract class AssistantError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** No language model is configured (missing API key). */
export class AssistantNotConfiguredError extends AssistantError {
  constructor() {
    super('El chat no está configurado: falta GROQ_API_KEY.');
  }
}

/** The model provider refused the request because of its usage limits. */
export class AssistantRateLimitedError extends AssistantError {
  constructor() {
    super(
      'Hay muchas preguntas en este momento. Inténtalo de nuevo en unos segundos.',
    );
  }
}

/** Any other failure of the model provider. */
export class AssistantUnavailableError extends AssistantError {
  constructor() {
    super(
      'El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    );
  }
}
