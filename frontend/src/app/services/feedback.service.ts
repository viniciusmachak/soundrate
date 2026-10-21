import { Injectable, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import {
  OperationFeedbackComponent,
  OperationFeedbackData,
  OperationFeedbackKind
} from '../components/operation-feedback/operation-feedback.component';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly i18n = inject(I18nService);

  constructor(private readonly snackBar: MatSnackBar) {}

  success(title: string, message: string, duration = 3200): MatSnackBarRef<OperationFeedbackComponent> {
    return this.show('success', title, message, duration);
  }

  error(title: string, message: string, duration = 4800): MatSnackBarRef<OperationFeedbackComponent> {
    return this.show('error', title, message, duration);
  }

  warning(title: string, message: string, duration = 4200): MatSnackBarRef<OperationFeedbackComponent> {
    return this.show('warning', title, message, duration);
  }

  info(title: string, message: string, duration = 3600): MatSnackBarRef<OperationFeedbackComponent> {
    return this.show('info', title, message, duration);
  }

  loading(title: string, message: string): MatSnackBarRef<OperationFeedbackComponent> {
    return this.show('loading', title, message);
  }

  retry(title: string, message: string, actionLabel?: string): MatSnackBarRef<OperationFeedbackComponent> {
    return this.show('error', title, message, 6000, actionLabel ?? this.i18n.t('common.tryAgain'));
  }

  private show(
    kind: OperationFeedbackKind,
    title: string,
    message: string,
    duration?: number,
    actionLabel?: string
  ): MatSnackBarRef<OperationFeedbackComponent> {
    const data: OperationFeedbackData = {
      kind,
      title,
      message,
      dismissible: kind !== 'loading',
      actionLabel
    };

    return this.snackBar.openFromComponent(OperationFeedbackComponent, {
      data,
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['soundrate-feedback-panel', `soundrate-feedback-panel--${kind}`],
      politeness: kind === 'error' || kind === 'warning' ? 'assertive' : 'polite',
      announcementMessage: `${title}. ${message}`
    });
  }
}
