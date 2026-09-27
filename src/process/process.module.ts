import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';

@Module({
  imports: [ConfigModule, StorageModule],
  controllers: [ProcessController],
  providers: [ProcessService],
})
export class ProcessModule {}
