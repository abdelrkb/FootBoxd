import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// Pagination des matchs notés d'un utilisateur (issues #51 et #56). `scope: 'season'` =
// uniquement la saison en cours, pour le compteur "Vus cette saison" du profil.
export class ListUserReviewsDto {
  @IsOptional()
  @IsIn(['all', 'season'])
  scope?: 'all' | 'season';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
