import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import { FeedbackService } from '../../services/feedback.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';
import { translateApiError } from '../../utils/http-errors';
import { GoogleSignInButtonComponent } from '../../components/google-sign-in-button/google-sign-in-button.component';
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    MatTooltipModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIcon,
    TranslatePipe,
    GoogleSignInButtonComponent
  ],
  templateUrl: './register-page.component.html',
  styleUrl: '../auth-page.shared.css'
})

export class RegisterPageComponent {
  registerForm: FormGroup;
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
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get errorMessage(): string | null {
    return this.failure ? translateApiError(this.i18n, this.failure.error, this.failure.fallback) : null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      // Show every field's error instead of silently ignoring the submit.
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.failure = null;

    this.authService.register(this.registerForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        const username = this.authService.currentUserValue?.username ?? this.registerForm.value.username;
        this.feedback.success(
          this.i18n.t('auth.register.ready'),
          this.i18n.t('auth.register.readyMessage', { username })
        );
      },
      error: (err) => {
        this.failure = { error: err, fallback: 'auth.register.failed' };
      }
    });
  }
}
