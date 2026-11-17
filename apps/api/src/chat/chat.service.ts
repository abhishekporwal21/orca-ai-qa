import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type ModelChatResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  model?: string;
};

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private get modelBaseUrl() {
    return process.env.ORCA_MODEL_BASE_URL?.trim().replace(/\/+$/, '') || '';
  }

  private get modelName() {
    return process.env.ORCA_MODEL_NAME?.trim() || 'Qwen/Qwen3-8B';
  }

  getModelStatus() {
    return {
      provider: 'self-hosted',
      model: this.modelName,
      configured: Boolean(this.modelBaseUrl),
    };
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
    if (!this.modelBaseUrl) {
      throw new ServiceUnavailableException('ORCA Model Engine is not connected yet. Deploy the dedicated GPU inference server and configure ORCA_MODEL_BASE_URL.');
    }

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
      conversation = await this.prisma.conversation.create({ data: { userId, model: this.modelName, title: input.message.slice(0, 60) } });
    }

    await this.prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: input.message } });
    const history = await this.prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' }, take: 30 });

    try {
      const endpoint = `${this.modelBaseUrl}/chat/completions`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.ORCA_MODEL_API_KEY) {
        headers.Authorization = `Bearer ${process.env.ORCA_MODEL_API_KEY}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: 'You are ORCA AI, a helpful, accurate and professional AI assistant. If uncertain, say so. Do not claim to have performed actions you have not performed.' },
            ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
          ],
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new BadGatewayException(`ORCA Model Engine returned HTTP ${response.status}: ${detail || response.statusText}`);
      }

      const result = await response.json() as ModelChatResponse;
      const rawContent = result.choices?.[0]?.message?.content;
      const answer = typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent.map((part) => part.text || '').join('')
          : '';
      if (!answer) throw new BadGatewayException('ORCA Model Engine returned an empty response.');

      await this.prisma.message.create({ data: { conversationId: conversation.id, role: 'assistant', content: answer } });
      await this.prisma.conversation.update({ where: { id: conversation.id }, data: { model: this.modelName } });
      return { conversationId: conversation.id, model: this.modelName, answer };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) throw error;
      const message = error instanceof Error && error.name === 'TimeoutError'
        ? 'ORCA Model Engine timed out. Check GPU server health and model loading.'
        : 'Could not connect to ORCA Model Engine. Check ORCA_MODEL_BASE_URL and the GPU server network access.';
      throw new ServiceUnavailableException(message);
    }
  }
}
