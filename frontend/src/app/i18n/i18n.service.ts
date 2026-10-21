import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { en } from './translations/en';
import { ptBR } from './translations/pt-BR';
import { PluralForms, TranslationKey, Translations } from './translation.types';

registerLocaleData(localePt, 'pt-BR');

export type AppLocale = 'en' | 'pt-BR';
export type TranslationParams = Record<string, string | number | null | undefined>;

export const SUPPORTED_LOCALES: readonly { value: AppLocale; label: string; shortLabel: string }[] = [
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'pt-BR', label: 'Português (Brasil)', shortLabel: 'PT' }
];

const STORAGE_KEY = 'soundrate.locale';
const DICTIONARIES: Record<AppLocale, Translations> = { en, 'pt-BR': ptBR };

/**
 * Runtime translations: `locale` is a signal, so templates and computed values that
 * call `t()` re-render as soon as the visitor switches language, without a reload.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly localeSignal = signal<AppLocale>(this.detectInitialLocale());
  private readonly pluralRules = computed(() => new Intl.PluralRules(this.localeSignal()));

  readonly locale = this.localeSignal.asReadonly();

  constructor() {
    effect(() => {
      const locale = this.localeSignal();
      this.document.documentElement.lang = locale;
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // Storage can be unavailable (private mode); the choice then lasts for this visit only.
      }
    });
  }

  setLocale(locale: AppLocale): void {
    this.localeSignal.set(locale);
  }

  /** Translates a dotted key, picking the plural form from `params.count` and filling `{param}` slots. */
  t(key: TranslationKey, params?: TranslationParams): string {
    const locale = this.localeSignal();
    const entry = this.lookup(DICTIONARIES[locale], key) ?? this.lookup(en, key);
    if (entry === undefined) return key;

    const template = typeof entry === 'string' ? entry : this.pluralForm(entry, Number(params?.['count'] ?? 0));

    return params ? this.interpolate(template, params) : template;
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.localeSignal(), options).format(value);
  }

  /** CLDR files 0 under "one" in Portuguese ("0 faixa"); zero reads as plural unless a `zero` form exists. */
  private pluralForm(forms: PluralForms, count: number): string {
    if (count === 0) return forms.zero ?? forms.other;
    return forms[this.pluralRules().select(count) as keyof PluralForms] ?? forms.other;
  }

  private lookup(dictionary: Translations, key: string): string | PluralForms | undefined {
    let node: unknown = dictionary;
    for (const part of key.split('.')) {
      if (node === null || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[part];
    }
    return typeof node === 'string' || (node && typeof node === 'object' && 'other' in node)
      ? node as string | PluralForms
      : undefined;
  }

  private interpolate(template: string, params: TranslationParams): string {
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      if (value === null || value === undefined) return match;
      return typeof value === 'number' ? this.formatNumber(value) : value;
    });
  }

  private detectInitialLocale(): AppLocale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'pt-BR') return stored;
    } catch {
      // Fall through to the browser language.
    }
    const languages = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
    return languages.some(language => language?.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en';
  }
}
