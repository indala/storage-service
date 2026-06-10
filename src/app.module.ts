import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { ProcessModule } from './process/process.module';
import { ChatModule } from './chat/chat.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    StorageModule,
    ProcessModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
