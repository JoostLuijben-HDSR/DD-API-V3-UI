import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { AppService } from '../../app.service';
import { readRecords } from '../../utils/odata-url';
import { odataString, PickerOption, referencesToOptions, searchOptions } from '../../utils/simple-search';

/**
 * Loads reference lists (organisations, measurement packages, locations, ...) for the
 * simple search, and remembers them for the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceListService {
  private cache = new Map<string, Observable<PickerOption[] | null>>();

  constructor(private service: AppService) { }

  /** The whole list of one reference type, optionally for one organisation. Null when loading failed. */
  list(baseUrl: string, apiKey: string, type: string, organisation?: string | null): Observable<PickerOption[] | null> {
    let filter = `Type eq ${odataString(type)}`;
    if (organisation) {
      filter += ` and Organisation eq ${odataString(organisation)}`;
    }
    const url = `${baseUrl}/references?$top=10000&$filter=${filter}`;
    let list = this.cache.get(url);
    if (!list) {
      list = this.service.get(url, apiKey).pipe(
        map(response => {
          if (!response || response.error) {
            throw new Error('Reference list could not be loaded');
          }
          return referencesToOptions(readRecords(response));
        }),
        catchError(() => {
          this.cache.delete(url);
          return of(null);
        }),
        shareReplay(1));
      this.cache.set(url, list);
    }
    return list;
  }

  /** Searches a large reference type (such as parameters and taxa) on the server by code. */
  search(baseUrl: string, apiKey: string, type: string, text: string, limit: number = 30): Observable<PickerOption[]> {
    const query = text.trim().toLowerCase();
    const filter = `Type eq ${odataString(type)} and contains(tolower(Code),${odataString(query)})`;
    const url = `${baseUrl}/references?$top=100&$filter=${filter}`;
    return this.service.get(url, apiKey).pipe(
      map(response => searchOptions(referencesToOptions(readRecords(response)), query, limit)),
      catchError(() => of([])));
  }
}
