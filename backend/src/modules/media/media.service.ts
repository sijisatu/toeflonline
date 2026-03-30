import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyReply } from 'fastify';
import { UploadMediaDto } from './dto/upload-media.dto';

@Injectable()
export class MediaService {
  private readonly storageRoot = join(process.cwd(), 'storage', 'uploads');

  upload(dto: UploadMediaDto) {
    const directory = dto.kind === 'question-image' ? 'question-images' : 'question-audio';
    const extension = this.resolveExtension(dto.fileName, dto.mimeType);
    const safeFileName = `${randomUUID()}${extension}`;
    const targetDir = join(this.storageRoot, directory);

    mkdirSync(targetDir, { recursive: true });

    const filePath = join(targetDir, safeFileName);
    const buffer = Buffer.from(dto.contentBase64, 'base64');

    writeFileSync(filePath, buffer);

    return {
      url: `/api/media/${directory}/${safeFileName}`,
      fileName: safeFileName,
      mimeType: dto.mimeType,
      size: buffer.byteLength,
    };
  }

  async sendFile(reply: FastifyReply, bucket: string, fileName: string) {
    if (!(bucket === 'question-images' || bucket === 'question-audio')) {
      throw new BadRequestException('Unsupported media bucket');
    }

    const filePath = join(this.storageRoot, bucket, fileName);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Media file not found');
    }

    const mimeType = this.mimeTypeFromExtension(fileName);
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.type(mimeType);
    return reply.send(createReadStream(filePath));
  }

  private resolveExtension(fileName: string, mimeType: string) {
    const extension = extname(fileName).toLowerCase();
    if (extension) return extension;

    if (mimeType.startsWith('image/')) {
      return mimeType === 'image/png' ? '.png' : '.jpg';
    }

    if (mimeType.startsWith('audio/')) {
      if (mimeType.includes('mpeg')) return '.mp3';
      if (mimeType.includes('wav')) return '.wav';
      if (mimeType.includes('ogg')) return '.ogg';
      return '.mp3';
    }

    throw new BadRequestException('Unsupported file type');
  }

  private mimeTypeFromExtension(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    switch (extension) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      case '.ogg':
        return 'audio/ogg';
      default:
        return 'application/octet-stream';
    }
  }
}
