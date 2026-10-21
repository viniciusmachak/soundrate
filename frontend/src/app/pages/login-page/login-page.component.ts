import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import { FeedbackService } from '../../services/feedback.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';
import { translateApiError } from '../../utils/http-errors';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIcon,
    TranslatePipe
  ],
  templateUrl: './login-page.component.html',
  styleUrl: '../auth-page.shared.css'
})
export class LoginPageComponent {
  loginForm: FormGroup;
  /** Kept as the raw error so the message follows language changes. */
  private failure: { error: unknown; fallback: TranslationKey } | null = null;
  hide = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private feedback: FeedbackService,
    private i18n: I18nService
  ) {

    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  get errorMessage(): string | null {
    return this.failure ? translateApiError(this.i18n, this.failure.error, this.failure.fallback) : null;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      // Show every field's error instead of silently ignoring the submit.
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.failure = null;
    this.authService.login(this.loginForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        const username = this.authService.currentUserValue?.username ?? this.loginForm.value.username;
        this.feedback.success(
          this.i18n.t('auth.login.welcomeBack'),
          this.i18n.t('auth.login.welcomeBackMessage', { username })
        );
      },
      error: (err) => {
        // Any failure other than a rate limit is reported as bad credentials.
        this.failure = { error: err.status === 429 ? err : null, fallback: 'auth.login.invalid' };
      }
    });
  }
}
