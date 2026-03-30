import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UploadMediaDto {
  @IsIn(['question-image', 'question-audio'])
  kind!: 'question-image' | 'question-audio';

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  contentBase64!: string;
}
