import { IsUUID } from 'class-validator';

export class ListReviewsDto {
  @IsUUID()
  matchId!: string;
}
