import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type PublicUser } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { AppleAuthGuard } from './guards/apple-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

const COOKIE_NAME = 'access_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.register(dto.email, dto.password, dto.displayName, dto.username);
    const token = this.authService.issueToken(user);
    setAuthCookie(res, token);
    return user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  login(@Req() req: Request & { user: PublicUser }, @Res({ passthrough: true }) res: Response) {
    const token = this.authService.issueToken(req.user);
    setAuthCookie(res, token);
    return req.user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: PublicUser) {
    return user;
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // Le guard redirige vers Google, ce handler n'est jamais exécuté.
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(@Req() req: Request & { user: PublicUser }, @Res() res: Response) {
    const token = this.authService.issueToken(req.user);
    setAuthCookie(res, token);
    res.redirect(process.env.WEB_URL ?? 'http://localhost:3010');
  }

  @UseGuards(AppleAuthGuard)
  @Get('apple')
  appleAuth() {
    // Le guard redirige vers Apple, ce handler n'est jamais exécuté.
  }

  // Apple répond en POST (response_mode=form_post imposé par passport-apple), pas en GET.
  @UseGuards(AppleAuthGuard)
  @Post('apple/callback')
  appleCallback(@Req() req: Request & { user: PublicUser }, @Res() res: Response) {
    const token = this.authService.issueToken(req.user);
    setAuthCookie(res, token);
    res.redirect(process.env.WEB_URL ?? 'http://localhost:3010');
  }
}
