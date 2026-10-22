import { IsBoolean } from 'class-validator';

export class SetProfilePrivacyDto {
  @IsBoolean()
  isPrivate!: boolean;
}
