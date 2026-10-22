import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  // Réponse en fil (issue #18) : id du commentaire auquel on répond, absent pour un commentaire
  // racine. Toujours rattaché au commentaire RACINE côté service (1 seul niveau de profondeur).
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
