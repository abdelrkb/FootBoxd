import { IsOptional, IsUUID } from 'class-validator';

export class SetFavoriteTeamDto {
  @IsOptional()
  @IsUUID()
  teamId?: string | null;
}
