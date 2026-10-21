import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, TranslationParams } from './i18n.service';
import { TranslationKey } from './translation.types';

/** `{{ 'album.tracks' | t }}` or `{{ 'album.trackCount' | t: { count: n } }}`. Impure so it follows the locale signal. */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
