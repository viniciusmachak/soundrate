import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { FeedbackService } from '../services/feedback.service';
import { I18nService } from '../i18n/i18n.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const feedback = inject(FeedbackService);
  const i18n = inject(I18nService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) {
        authService.logout();
        feedback.warning(
          i18n.t('session.expired'),
          i18n.t('session.expiredMessage')
        );
      }
      return throwError(() => error);
    })
  );
};
