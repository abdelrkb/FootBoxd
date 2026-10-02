import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName?: string;

  // Chaîne vide acceptée pour effacer la bio (convertie en `null` côté service si besoin,
  // sinon stockée telle quelle).
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;
}
