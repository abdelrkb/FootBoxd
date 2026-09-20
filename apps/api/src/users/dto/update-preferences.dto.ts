import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  notifyOnLike?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnComment?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnNewFollower?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyKickoffReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  hideScoresUntilClick?: boolean;
}
