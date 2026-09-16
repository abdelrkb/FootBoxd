import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListMatchesDto {
  // Jour affiché dans le calendrier de l'écran Accueil (section 7 : navigable jusqu'à +5 jours).
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  leagueId?: string;
}
