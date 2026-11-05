import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { AudioService } from '../../services/audio.service';

const STORAGE_KEY = 'soundrate.cookieNoticeDismissed';

/**
 * Tells first-time visitors how the site stores data. Soundrate sets no cookies of its own and
 * Umami runs without them, so there is nothing to opt out of: this informs, it doesn't ask for consent.
 */
@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [MatButtonModule, RouterLink, TranslatePipe],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CookieBannerComponent {
  /** The player is fixed to the bottom of the page, so the notice sits above it while a track is loaded. */
  readonly currentTrack = toSignal(inject(AudioService).currentTrack$);
  readonly visible = signal(!this.wasDismissed());

  dismiss(): void {
    this.visible.set(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage can be unavailable (private mode); the notice then returns on the next visit.
    }
  }

  private wasDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
