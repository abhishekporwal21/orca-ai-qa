import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma.service';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true })], controllers: [ChatController, HealthController], providers: [ChatService, PrismaService] })
export class AppModule {}
