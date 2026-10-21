import { formatDate, formatNumber } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/** Like `date`, but formatted in the visitor's current language. */
@Pipe({ name: 'localDate', standalone: true, pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: string | number | Date | null | undefined, format = 'mediumDate'): string | null {
    if (value === null || value === undefined || value === '') return null;
    return formatDate(value, format, this.i18n.locale());
  }
}

/** Like `number`, but formatted in the visitor's current language. */
@Pipe({ name: 'localNumber', standalone: true, pure: false })
export class LocalNumberPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: number | null | undefined, digitsInfo?: string): string | null {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    return formatNumber(value, this.i18n.locale(), digitsInfo);
  }
}
