import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppLocale, I18nService, SUPPORTED_LOCALES } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css'
})
export class LanguageSwitcherComponent {
  /** `compact` toggles to the other language (toolbar); `full` lists every language inline (sidebar, footer, settings). */
  readonly variant = input<'compact' | 'full'>('compact');

  readonly i18n = inject(I18nService);
  readonly locales = SUPPORTED_LOCALES;

  get current() {
    return this.locales.find(locale => locale.value === this.i18n.locale()) ?? this.locales[0];
  }

  get next() {
    const index = this.locales.indexOf(this.current);
    return this.locales[(index + 1) % this.locales.length];
  }

  select(locale: AppLocale): void {
    this.i18n.setLocale(locale);
  }
}
