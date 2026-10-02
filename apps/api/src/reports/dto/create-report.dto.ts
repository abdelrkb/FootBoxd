import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ReportTargetType, ReportReason } from '@football-app/database';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsUUID()
  targetId!: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
