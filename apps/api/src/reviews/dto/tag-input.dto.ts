import { IsHexColor, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Tag existant réutilisé (id fourni, couleur ignorée — voir reviews.service#resolveTagIds)
// ou nouveau tag à créer (pas d'id, couleur choisie par l'utilisateur dans le color-picker).
export class TagInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsHexColor()
  colorEnd?: string;
}
