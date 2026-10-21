import { Injectable, Provider, effect, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { I18nService } from './i18n.service';

/** Material paginator labels in the visitor's language, refreshed on every language change. */
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  private readonly i18n = inject(I18nService);

  constructor() {
    super();
    effect(() => {
      this.i18n.locale();
      this.itemsPerPageLabel = this.i18n.t('paginator.itemsPerPage');
      this.nextPageLabel = this.i18n.t('paginator.nextPage');
      this.previousPageLabel = this.i18n.t('paginator.previousPage');
      this.firstPageLabel = this.i18n.t('paginator.firstPage');
      this.lastPageLabel = this.i18n.t('paginator.lastPage');
      this.changes.next();
    });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return this.i18n.t('paginator.emptyRange', { total: length });
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return this.i18n.t('paginator.range', { start: start + 1, end, total: length });
  };
}

/**
 * Provided by the pages that show a paginator (not at the root) so Material's
 * paginator stays out of the initial bundle.
 */
export const TRANSLATED_PAGINATOR: Provider = { provide: MatPaginatorIntl, useClass: TranslatedPaginatorIntl };
