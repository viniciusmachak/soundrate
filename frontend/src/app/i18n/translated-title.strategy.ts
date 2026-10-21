import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';
import { TranslationKey } from './translation.types';

/**
 * Route `title`s are translation keys under `titles.*`. Pages can override the title
 * (e.g. "Album not found") with `setPageTitle`; both follow language changes.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private routeTitleKey: TranslationKey | null = null;
  private overrideKey: TranslationKey | null = null;

  constructor() {
    super();
    effect(() => {
      this.i18n.locale();
      this.apply();
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.routeTitleKey = (this.buildTitle(snapshot) as TranslationKey | undefined) ?? null;
    this.overrideKey = null;
    this.apply();
  }

  /** Replaces the route title until the next navigation; `null` restores it. */
  setPageTitle(key: TranslationKey | null): void {
    this.overrideKey = key;
    this.apply();
  }

  private apply(): void {
    const key = this.overrideKey ?? this.routeTitleKey;
    if (!key) {
      this.title.setTitle(this.i18n.t('common.appName'));
      return;
    }
    this.title.setTitle(this.i18n.t('titles.suffix', { title: this.i18n.t(key) }));
  }
}
