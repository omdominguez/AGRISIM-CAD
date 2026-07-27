import { Module } from '@nestjs/common';
import { NewsFeedService } from './news-feed.service';
import { NewsFeedController } from './news-feed.controller';

@Module({
  providers: [NewsFeedService],
  controllers: [NewsFeedController],
})
export class NewsFeedModule {}
