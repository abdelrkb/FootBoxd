import { IsEmail, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // limite bcrypt
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName!: string;

  // Handle unique (recherche, @mentions) — distinct de displayName. Minuscules/chiffres/underscore
  // uniquement pour rester simple à taper et à chercher.
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message: 'Le pseudo doit faire 3 à 20 caractères : minuscules, chiffres, underscore uniquement',
  })
  username!: string;
}
