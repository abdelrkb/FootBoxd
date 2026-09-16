import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

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
}
