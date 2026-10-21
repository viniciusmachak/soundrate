import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';
import { translateApiError } from '../../utils/http-errors';

@Component({
  selector: 'app-forget-password-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './forget-password-page.component.html',
  styleUrl: '../auth-page.shared.css'
})
export class ForgetPasswordPageComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  isLoading = false;
  isSuccess = false;
  /** Kept as the raw error so the message follows language changes. */
  private failure: { error: unknown; fallback: TranslationKey } | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private i18n: I18nService
  ) { }

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get errorMessage(): string | null {
    return this.failure ? translateApiError(this.i18n, this.failure.error, this.failure.fallback) : null;
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      // Show every field's error instead of silently ignoring the submit.
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.failure = null;
    const email = this.forgotPasswordForm.value.email;

    this.apiService.requestPasswordReset(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.failure = err.status === 429
          ? { error: null, fallback: 'auth.forgot.tooManyRequests' }
          : { error: err, fallback: 'auth.errors.unexpected' };
        console.error(err);
      }
    });
  }
}
