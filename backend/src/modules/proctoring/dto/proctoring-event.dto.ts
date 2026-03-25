import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

const eventTypes = [
  'camera_blocked',
  'microphone_blocked',
  'tab_switch',
  'fullscreen_exit',
  'heartbeat',
  'session_started',
  'session_ended',
  'snapshot_uploaded',
] as const;

export class ProctoringEventDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @IsIn(eventTypes)
  eventType!: (typeof eventTypes)[number];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
