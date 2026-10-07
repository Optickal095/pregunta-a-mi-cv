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
import type { Question } from '../../../domain/conversation.js';

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_HISTORY_TURNS = 10;

export class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

/** Body of `POST /chat` and `POST /chat/stream`: validated, then turned into a domain `Question`. */
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

  /** Language of the page the question comes from; used when the question's own language is unclear. */
  @IsOptional()
  @IsIn(['es', 'en'])
  locale?: 'es' | 'en';

  toQuestion(): Question {
    return {
      message: this.message,
      history: (this.history ?? []).map(({ role, content }) => ({
        role,
        content,
      })),
      locale: this.locale ?? 'es',
    };
  }
}
