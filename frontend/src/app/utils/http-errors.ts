import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translation.types';

/** True when the API says the requested entity doesn't exist (404) or its ID is malformed (400). */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
}

/** Known API messages (the backend answers in English) mapped to translation keys. */
const API_MESSAGE_KEYS: Record<string, TranslationKey> = {
  'Username already exists': 'auth.errors.usernameTaken',
  'Email already in use': 'auth.errors.emailTaken',
  'Invalid password reset token.': 'auth.errors.invalidResetToken',
  'Password reset token has expired.': 'auth.errors.expiredResetToken'
};

/**
 * Turns an API error into a message in the visitor's language: rate limits and known
 * backend messages get their own text, anything else falls back to `fallbackKey`.
 */
export function translateApiError(i18n: I18nService, error: unknown, fallbackKey: TranslationKey): string {
  if (!(error instanceof HttpErrorResponse)) return i18n.t(fallbackKey);

  const message: unknown = error.error?.message;
  if (error.status === 429) {
    const seconds = typeof message === 'string' ? message.match(/(\d+) seconds?/)?.[1] : undefined;
    return seconds
      ? i18n.t('auth.errors.tooManyAttemptsSeconds', { seconds: Number(seconds) })
      : i18n.t('auth.errors.tooManyAttempts');
  }

  const key = typeof message === 'string' ? API_MESSAGE_KEYS[message] : undefined;
  return i18n.t(key ?? fallbackKey);
}
