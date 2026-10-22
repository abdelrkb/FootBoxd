import { IsIn } from 'class-validator';

// Liste figée ici côté API (pas de dépendance au front pour valider) — garder synchronisée
// avec apps/web/src/i18n/config.ts `locales` si une langue est ajoutée.
export class SetLocaleDto {
  @IsIn(['fr', 'en'])
  locale!: 'fr' | 'en';
}
