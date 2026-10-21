import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';

/** What could not be found: an unknown route, or an album/artist/member the URL points to. */
export type NotFoundKind = 'page' | 'album' | 'artist' | 'user';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, TranslatePipe],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.css'
})
export class NotFoundPageComponent {
  readonly kind = input<NotFoundKind>('page');

  readonly titleKey = computed<TranslationKey>(() => `notFound.${this.kind()}.title`);
  readonly copyKey = computed<TranslationKey>(() => `notFound.${this.kind()}.copy`);
}
