import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  // Optionnel : absent pour un compte créé uniquement par OAuth (pas de mot de passe) — voir
  // users.service.ts `deleteAccount`.
  @IsOptional()
  @IsString()
  password?: string;
}
