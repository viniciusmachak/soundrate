import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { User } from '../../models/user.model';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { FeedbackService } from '../../services/feedback.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value ? { passwordMismatch: true } : null;
};
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    LanguageSwitcherComponent
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  currentUser!: User | null;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  isUpdatingProfile = false;
  isUpdatingPassword = false;
  isUploadingAvatar = false;
  isResettingAvatar = false;
  isDeletingAccount = false;

  get hasProfileChanges(): boolean {
    if (!this.profileForm) return false;

    return this.profileForm.get('email')?.value !== (this.currentUser?.email || '')
      || this.normalizeBio(this.profileForm.get('bio')?.value) !== this.normalizeBio(this.currentUser?.bio);
  }

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthService,
    private feedback: FeedbackService,
    private dialog: MatDialog,
    private i18n: I18nService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.imagePreview = this.currentUser?.avatarUrl || null;

    this.profileForm = this.fb.group({
      email: [this.currentUser?.email || '', [Validators.required, Validators.email]],
      bio: [this.currentUser?.bio || '', [Validators.maxLength(280)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  private normalizeBio(bio: string | null | undefined): string {
    return bio?.trim() || '';
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid || !this.hasProfileChanges) return;

    this.isUpdatingProfile = true;
    this.apiService.updateProfile(this.profileForm.value).pipe(
      finalize(() => this.isUpdatingProfile = false)
    ).subscribe({
      next: (updatedUser) => {
        this.currentUser = updatedUser;
        this.authService.updateCurrentUser(updatedUser);
        this.profileForm.markAsPristine();
        this.feedback.success(
          this.i18n.t('settings.feedback.profileUpdated'),
          this.i18n.t('settings.feedback.profileUpdatedMessage', { username: updatedUser.username })
        );
      },
      error: () => this.feedback.error(
        this.i18n.t('settings.feedback.profileError'),
        this.i18n.t('settings.feedback.profileErrorMessage')
      )
    });
  }

  onUpdatePassword(): void {
    if (this.passwordForm.invalid) return;

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isUpdatingPassword = true;
    this.apiService.updatePassword({ currentPassword, newPassword }).pipe(
      finalize(() => this.isUpdatingPassword = false)
    ).subscribe({
      next: () => {
        this.feedback.success(
          this.i18n.t('settings.feedback.passwordChanged'),
          this.i18n.t('settings.feedback.passwordChangedMessage')
        );
        this.passwordForm.reset();
      },
      error: () => this.feedback.error(
        this.i18n.t('settings.feedback.passwordError'),
        this.i18n.t('settings.feedback.passwordErrorMessage')
      )
    });
  }

  deleteAccount(): void {

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: this.i18n.t('settings.feedback.deleteTitle'),
        message: this.i18n.t('settings.feedback.deleteMessage'),
        confirmLabel: this.i18n.t('settings.feedback.deleteConfirm'),
        cancelLabel: this.i18n.t('settings.feedback.deleteCancel')
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isDeletingAccount = true;
        this.apiService.deleteCurrentUser().pipe(
          finalize(() => this.isDeletingAccount = false)
        ).subscribe({
          next: () => {
            this.feedback.success(
              this.i18n.t('settings.feedback.accountDeleted'),
              this.currentUser?.username
                ? this.i18n.t('settings.feedback.accountDeletedMessage', { username: this.currentUser.username })
                : this.i18n.t('settings.feedback.accountDeletedAnonymous'),
              5200
            );
            this.authService.logout();
          },
          error: () => this.feedback.error(
            this.i18n.t('settings.feedback.deleteError'),
            this.i18n.t('settings.feedback.deleteErrorMessage'),
            5200
          )
        });
      }
    });
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      // Same limit as the backend, checked here so the user knows before uploading.
      if (file.size > MAX_AVATAR_BYTES) {
        this.feedback.error(
          this.i18n.t('settings.feedback.imageTooLarge'),
          this.i18n.t('settings.feedback.imageTooLargeMessage')
        );
        target.value = '';
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  onUploadAvatar(): void {
    if (!this.selectedFile) {
      return;
    }

    this.isUploadingAvatar = true;
    this.apiService.updateAvatar(this.selectedFile).pipe(
      finalize(() => this.isUploadingAvatar = false)
    ).subscribe({
      next: (updatedUser) => {
        this.feedback.success(
          this.i18n.t('settings.feedback.photoUpdated'),
          this.i18n.t('settings.feedback.photoUpdatedMessage')
        );
        this.currentUser = updatedUser;
        this.authService.updateCurrentUser(updatedUser);
        this.imagePreview = updatedUser.avatarUrl;
        this.selectedFile = null;
      },
      error: (err) => this.feedback.error(
        this.i18n.t('settings.feedback.uploadError'),
        this.i18n.t(err.status === 413 ? 'settings.feedback.uploadTooLarge' : 'settings.feedback.uploadInvalid')
      )
    });
  }

  onResetAvatar(): void {
    this.isResettingAvatar = true;
    this.apiService.resetAvatar().pipe(
      finalize(() => this.isResettingAvatar = false)
    ).subscribe({
      next: (updatedUser) => {
        this.feedback.success(
          this.i18n.t('settings.feedback.photoReset'),
          this.i18n.t('settings.feedback.photoResetMessage')
        );
        this.currentUser = updatedUser;
        this.authService.updateCurrentUser(updatedUser);
        this.imagePreview = updatedUser.avatarUrl;
        this.selectedFile = null;
      },
      error: () => this.feedback.error(
        this.i18n.t('settings.feedback.resetError'),
        this.i18n.t('settings.feedback.resetErrorMessage')
      )
    });
  }
}
