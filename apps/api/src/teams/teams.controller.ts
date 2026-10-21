import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { TeamsService } from './teams.service.js';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // Route littérale AVANT ':id' — sinon NestJS/ParseUUIDPipe tente de parser "search" comme un
  // id et rejette avec un 400 (même précédent que reviews.controller.ts `popular`/`following`).
  @Get('search')
  search(@Query('q') q = '') {
    return this.teamsService.search(q);
  }

  @Get(':id')
  overview(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.getOverview(id);
  }

  @Get(':id/standings')
  standings(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.getStandingsTable(id);
  }

  @Get(':id/matches')
  matches(@Param('id', ParseUUIDPipe) id: string, @Query('scope') scope?: string) {
    return this.teamsService.findMatches(id, scope === 'past' ? 'past' : 'upcoming');
  }

  @Get(':id/squad')
  squad(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.getSquad(id);
  }

  @Get(':id/stats')
  stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamsService.getStats(id);
  }
}
