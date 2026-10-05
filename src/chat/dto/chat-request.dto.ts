import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_HISTORY_TURNS = 10;

export class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MESSAGE_LENGTH)
  message: string;

  /** Previous turns of the conversation, oldest first. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_HISTORY_TURNS)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];
}

export interface ChatResponse {
  answer: string;
  /** Knowledge sections given to the model, as "file › section". */
  sources: string[];
}

/** One Server-Sent Event of `POST /chat/stream`, sent as JSON in `data:`. */
export type ChatStreamEvent =
  | { type: 'sources'; sources: string[] }
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
