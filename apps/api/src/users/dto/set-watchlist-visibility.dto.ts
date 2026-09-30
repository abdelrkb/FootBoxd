import { IsBoolean } from 'class-validator';

export class SetWatchlistVisibilityDto {
  @IsBoolean()
  isPublic!: boolean;
}
