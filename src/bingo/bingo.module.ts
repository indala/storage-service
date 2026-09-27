import { Module } from '@nestjs/common';
import { BingoGateway } from './bingo.gateway';

@Module({
  providers: [BingoGateway],
  exports: [BingoGateway],
})
export class BingoModule {}
