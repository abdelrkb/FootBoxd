import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { MatchesService } from './matches.service.js';
import { ListMatchesDto } from './dto/list-matches.dto.js';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  list(@Query() query: ListMatchesDto) {
    return this.matchesService.findByDate(query.date, query.leagueId);
  }

  // Route littérale AVANT ':id' — sinon NestJS matche "popular" comme un id.
  @Get('popular')
  popular() {
    return this.matchesService.findPopular();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findById(id);
  }
}
