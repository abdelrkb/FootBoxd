import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { TagInputDto } from './tag-input.dto.js';

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => TagInputDto)
  tags?: TagInputDto[];

  // "Noter" depuis une mini-card (issue #15) : true si posée sans ouvrir le formulaire complet
  // — exclut la review des flux de logs (voir reviews.service.ts). Absent/false = log normal.
  @IsOptional()
  @IsBoolean()
  quickRating?: boolean;
}
