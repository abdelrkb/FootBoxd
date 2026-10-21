import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { TagInputDto } from './tag-input.dto.js';

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  // Absent = tags inchangés. Présent (même vide) = remplace l'ensemble des tags de la review.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => TagInputDto)
  tags?: TagInputDto[];

  // "Compléter ma note rapide" (issue #15) : repasse explicitement une review quickRating à un
  // vrai log (false) en même temps qu'on ajoute un commentaire. Absent = inchangé.
  @IsOptional()
  @IsBoolean()
  quickRating?: boolean;
}
