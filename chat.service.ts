import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.service';

const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o'];

@Injectable()
export class ChatService {
  private client: OpenAI | null = null;
  constructor(private prisma: PrismaService) {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined });
    }
  }

  async listConversations(userId: string) {
    return this.prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, model: true, updatedAt: true } });
  }

  async getConversation(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({ where: { id, userId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async send(userId: string, input: { message: string; conversationId?: string; model?: string }) {
    if (!this.client) throw new ServiceUnavailableException('AI provider is not configured. Set OPENAI_API_KEY in the API environment.');
    const model = input.model && ALLOWED_MODELS.includes(input.model) ? input.model : 'gpt-4o-mini';
    // Ensure the QA demo identity exists before creating a conversation (User is a required FK).
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@qa.orca.local`, passwordHash: 'qa-only-no-password' }
    });
    let conversation = input.conversationId
      ? await this.prisma.conversation.findFirst({ where: { id: input.conversationId, userId } })
      : null;
    if (input.conversationId && !conversation) throw new NotFoundException('Conversation not found');
    if (!conversation) {
      conversation = await this.prisma.conversation.create({ data: { userId, model, title: input.message.slice(0, 60) } });
    }
    await this.prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: input.message } });
    const history = await this.prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' }, take: 30 });
    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are ORCA AI, a helpful, accurate and professional AI assistant. If uncertain, say so. Do not claim to have performed actions you have not performed.' },
          ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        ],
        temperature: 0.7
      });
      const answer = completion.choices[0]?.message?.content || 'I could not generate a response.';
      await this.prisma.message.create({ data: { conversationId: conversation.id, role: 'assistant', content: answer } });
      await this.prisma.conversation.update({ where: { id: conversation.id }, data: { model } });
      return { conversationId: conversation.id, model, answer };
    } catch (error) {
      throw new ServiceUnavailableException(error?.message || 'AI provider request failed');
    }
  }
}
