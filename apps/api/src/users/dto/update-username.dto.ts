import { IsString, Matches } from 'class-validator';

export class UpdateUsernameDto {
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message: 'Le pseudo doit faire 3 à 20 caractères : minuscules, chiffres, underscore uniquement',
  })
  username!: string;
}
