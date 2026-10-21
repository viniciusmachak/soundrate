import { Component, ElementRef, NgZone, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { AuthService } from '../../services/auth.service';
import { FeedbackService } from '../../services/feedback.service';
import { GoogleAccountsId, GoogleCredentialResponse, loadGoogleIdentity } from '../../utils/google-identity';
import { translateApiError } from '../../utils/http-errors';

const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

/**
 * "Continue with Google": signs in, or creates the account on first use.
 * Renders nothing when the Google script can't load (blocked, offline), so the
 * email and password form stays the only option instead of a broken button.
 */
@Component({
  selector: 'app-google-sign-in-button',
  standalone: true,
  imports: [MatIcon, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './google-sign-in-button.component.html',
  styleUrl: './google-sign-in-button.component.css'
})
export class GoogleSignInButtonComponent {
  private readonly authService = inject(AuthService);
  private readonly feedback = inject(FeedbackService);
  private readonly i18n = inject(I18nService);
  private readonly zone = inject(NgZone);
  private readonly buttonHost = viewChild<ElementRef<HTMLElement>>('buttonHost');

  private readonly googleId = signal<GoogleAccountsId | null>(null);
  readonly unavailable = signal(false);
  readonly isSigningIn = signal(false);
  /** Kept as the raw error so the message follows language changes. */
  private readonly failure = signal<{ error: unknown } | null>(null);

  constructor() {
    afterNextRender(() => {
      loadGoogleIdentity()
        .then(googleId => {
          googleId.initialize({
            client_id: environment.googleClientId,
            callback: response => this.zone.run(() => this.onCredential(response)),
            cancel_on_tap_outside: true
          });
          this.googleId.set(googleId);
        })
        .catch(() => this.unavailable.set(true));
    });

    // Google draws the button in the given locale, so redraw it when the language changes.
    effect(() => {
      const googleId = this.googleId();
      const host = this.buttonHost()?.nativeElement;
      const locale = this.i18n.locale();
      if (!googleId || !host) return;

      host.replaceChildren();
      googleId.renderButton(host, {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width: Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, host.clientWidth)),
        locale
      });
    });
  }

  get errorMessage(): string | null {
    const failure = this.failure();
    return failure ? translateApiError(this.i18n, failure.error, 'auth.google.failed') : null;
  }

  private onCredential(response: GoogleCredentialResponse): void {
    this.isSigningIn.set(true);
    this.failure.set(null);

    this.authService.loginWithGoogle(response.credential).pipe(
      finalize(() => this.isSigningIn.set(false))
    ).subscribe({
      next: () => {
        const username = this.authService.currentUserValue?.username ?? '';
        this.feedback.success(
          this.i18n.t('auth.login.welcomeBack'),
          this.i18n.t('auth.google.signedInMessage', { username })
        );
      },
      // Only rate limits get their own text; anything else is a generic Google failure.
      error: err => this.failure.set({ error: err.status === 429 ? err : null })
    });
  }
}
