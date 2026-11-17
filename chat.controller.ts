import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

// QA bootstrap identity only. Replace with verified JWT authentication before exposing this service publicly.
function qaUserId(header?: string) {
  if (process.env.QA_MODE !== 'true') throw new UnauthorizedException('QA demo identity is disabled. Enable QA_MODE only in an isolated QA environment.');
  return header || 'qa-demo-user';
}

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}
  @Get('conversations') list(@Headers('x-qa-user') user?: string) { return this.chat.listConversations(qaUserId(user)); }
  @Get('conversations/:id') get(@Param('id') id: string, @Headers('x-qa-user') user?: string) { return this.chat.getConversation(qaUserId(user), id); }
  @Post('messages') send(@Body() dto: SendMessageDto, @Headers('x-qa-user') user?: string) { return this.chat.send(qaUserId(user), dto); }
}
