import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(12000) message: string;
  @IsOptional() @IsString() @MaxLength(100) conversationId?: string;
  @IsOptional() @IsString() @MaxLength(100) model?: string;
}
