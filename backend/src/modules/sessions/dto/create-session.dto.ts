import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  packageId!: string;

  @IsUUID()
  currentSectionId!: string;

  @IsBoolean()
  proctoringEnabled!: boolean;
}
