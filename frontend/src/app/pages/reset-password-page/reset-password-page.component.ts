import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators, ReactiveFormsModule } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, ResetPasswordRequest } from '../../services/api.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationKey } from '../../i18n/translation.types';
import { translateApiError } from '../../utils/http-errors';

export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  return password && confirmPassword && password.value !== confirmPassword.value ? { passwordsMismatch: true } : null;
};
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    MatTooltipModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './reset-password-page.component.html',
  styleUrl: '../auth-page.shared.css'
})
export class ResetPasswordPageComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  isLoading = false;
  isSuccess = false;
  /** Kept as the raw error so the message follows language changes. */
  private failure: { error: unknown; fallback: TranslationKey } | null = null;
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private i18n: I18nService
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token');
      if (!this.token) {
        this.failure = { error: null, fallback: 'auth.reset.missingToken' };
      }
    });

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordsMatchValidator });
  }

  get errorMessage(): string | null {
    return this.failure ? translateApiError(this.i18n, this.failure.error, this.failure.fallback) : null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token) {
      // Show every field's error instead of silently ignoring the submit.
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.failure = null;
    const { newPassword } = this.resetPasswordForm.value;

    this.apiService.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.failure = { error: err, fallback: 'auth.reset.invalidToken' };
        console.error(err);
      }
    });
  }
}
