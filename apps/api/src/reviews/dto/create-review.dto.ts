import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  matchId!: string;

  // Bornes/pas de 0.5 vérifiés dans le service (message d'erreur clair) ET par la contrainte
  // CHECK en base (garde-fou ultime) — voir packages/database/prisma/migrations/.../migration.sql.
  @IsNumber()
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
