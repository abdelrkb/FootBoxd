import { IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit faire 6 chiffres' })
  code!: string;
}
