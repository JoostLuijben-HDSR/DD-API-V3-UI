import { Injectable, OnDestroy } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { I18nService } from './i18n.service';

/** Texts of the table paginator in the chosen language. */
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl implements OnDestroy {
  private subscription: Subscription;

  constructor(private i18n: I18nService) {
    super();
    this.setTexts();
    this.subscription = this.i18n.changes$.subscribe(() => {
      this.setTexts();
      this.changes.next();
    });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return this.i18n.t('paginator.rangeEmpty', { length });
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return this.i18n.t('paginator.range', { start: start + 1, end, length });
  };

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private setTexts(): void {
    this.itemsPerPageLabel = this.i18n.t('paginator.itemsPerPage');
    this.nextPageLabel = this.i18n.t('paginator.next');
    this.previousPageLabel = this.i18n.t('paginator.previous');
    this.firstPageLabel = this.i18n.t('paginator.first');
    this.lastPageLabel = this.i18n.t('paginator.last');
  }
}
