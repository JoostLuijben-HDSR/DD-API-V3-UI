import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { AppService } from '../../app.service';
import { readCount, readRecords } from '../../utils/odata-url';
import { odataString, PickerOption, referencesToOptions, searchOptions } from '../../utils/simple-search';

/** Maximum number of references loaded for one list. */
export const MAX_REFERENCES = 10000;

/**
 * Loads reference lists (organisations, measurement packages, locations, ...) and
 * remembers them for the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceListService {
  private recordCache = new Map<string, Observable<unknown[] | null>>();
  private countCache = new Map<string, Observable<number | null>>();

  constructor(private service: AppService) { }

  /** All records of one reference type (at most MAX_REFERENCES), optionally for one organisation. Null when loading failed. */
  records(baseUrl: string, apiKey: string, type: string, organisation?: string | null): Observable<unknown[] | null> {
    const url = `${baseUrl}/references?$top=${MAX_REFERENCES}&$filter=${this.filter(type, organisation)}`;
    let records = this.recordCache.get(url);
    if (!records) {
      records = this.service.get(url, apiKey).pipe(
        map(response => {
          if (!response || response.error) {
            throw new Error('Reference list could not be loaded');
          }
          return readRecords(response);
        }),
        catchError(() => {
          this.recordCache.delete(url);
          return of(null);
        }),
        shareReplay(1));
      this.recordCache.set(url, records);
    }
    return records;
  }

  /** The whole list of one reference type as options, optionally for one organisation. Null when loading failed. */
  list(baseUrl: string, apiKey: string, type: string, organisation?: string | null): Observable<PickerOption[] | null> {
    return this.records(baseUrl, apiKey, type, organisation).pipe(
      map(records => records === null ? null : referencesToOptions(records)));
  }

  /** Number of references of a type (optionally for one organisation), or null when unknown. */
  count(baseUrl: string, apiKey: string, type: string, organisation?: string | null): Observable<number | null> {
    const url = `${baseUrl}/references?$top=1&$count=true&$filter=${this.filter(type, organisation)}`;
    let count = this.countCache.get(url);
    if (!count) {
      count = this.service.get(url, apiKey).pipe(
        map(response => readCount(response)),
        catchError(() => of(null)),
        shareReplay(1));
      this.countCache.set(url, count);
    }
    return count;
  }

  /** Searches records of a large reference type (such as parameters and taxa) on the server by code. */
  searchRecords(baseUrl: string, apiKey: string, type: string, text: string, top: number = 200): Observable<unknown[]> {
    const query = text.trim().toLowerCase();
    const filter = `${this.filter(type)} and contains(tolower(Code),${odataString(query)})`;
    const url = `${baseUrl}/references?$top=${top}&$filter=${filter}`;
    return this.service.get(url, apiKey).pipe(
      map(response => readRecords(response)),
      catchError(() => of([])));
  }

  /** Searches a large reference type on the server by code, as options. */
  search(baseUrl: string, apiKey: string, type: string, text: string, limit: number = 30): Observable<PickerOption[]> {
    return this.searchRecords(baseUrl, apiKey, type, text, 100).pipe(
      map(records => searchOptions(referencesToOptions(records), text.trim().toLowerCase(), limit)));
  }

  private filter(type: string, organisation?: string | null): string {
    let filter = `Type eq ${odataString(type)}`;
    if (organisation) {
      filter += ` and Organisation eq ${odataString(organisation)}`;
    }
    return filter;
  }
}
