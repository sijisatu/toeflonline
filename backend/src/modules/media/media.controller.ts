import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  upload(@Body() dto: UploadMediaDto) {
    return this.mediaService.upload(dto);
  }

  @Get(':bucket/:fileName')
  async getFile(
    @Param('bucket') bucket: string,
    @Param('fileName') fileName: string,
    @Res() reply: FastifyReply,
  ) {
    return this.mediaService.sendFile(reply, bucket, fileName);
  }
}
