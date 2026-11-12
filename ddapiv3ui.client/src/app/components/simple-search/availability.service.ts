import { Injectable } from '@angular/core';
import { concat, from, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, timeout } from 'rxjs/operators';
import { AppService } from '../../app.service';
import { Availability } from '../../utils/list-search';

export interface AvailabilityCheck {
  /** Option value the result belongs to. */
  value: string;
  /** Complete $filter for the observations end point. */
  filter: string;
}

export interface AvailabilityProgress {
  states: Record<string, Availability>;
  done: number;
  total: number;
}

/** Short, non-reversible fingerprint of the API key, so results are kept per key. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Checks for options whether any observations exist (with $top=1), a few requests at a
 * time. Results are remembered for the session, per service and API key.
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private cache = new Map<string, Availability>();

  constructor(private service: AppService) { }

  check(baseUrl: string, apiKey: string, checks: AvailabilityCheck[], concurrency: number = 4): Observable<AvailabilityProgress> {
    const keyPart = `${baseUrl}|${fingerprint(apiKey)}|`;
    const states: Record<string, Availability> = {};
    let done = 0;
    const total = checks.length;
    const pending: AvailabilityCheck[] = [];
    for (const check of checks) {
      const cached = this.cache.get(keyPart + check.filter);
      if (cached) {
        states[check.value] = cached;
        done++;
      } else {
        pending.push(check);
      }
    }
    const snapshot = (): AvailabilityProgress => ({ states: { ...states }, done, total });
    return concat(
      of(snapshot()),
      from(pending).pipe(
        mergeMap(check => this.probe(baseUrl, apiKey, check.filter).pipe(map(state => ({ check, state }))), concurrency),
        map(({ check, state }) => {
          states[check.value] = state;
          done++;
          if (state !== 'unknown') {
            this.cache.set(keyPart + check.filter, state);
          }
          return snapshot();
        })));
  }

  private probe(baseUrl: string, apiKey: string, filter: string): Observable<Availability> {
    const url = `${baseUrl}/observations?$top=1&$select=Id&$filter=${filter}`;
    return this.service.get(url, apiKey).pipe(
      timeout(30000),
      map((response: any): Availability => {
        if (response && Array.isArray(response.value)) {
          return response.value.length > 0 ? 'yes' : 'no';
        }
        return 'unknown';
      }),
      catchError(() => of<Availability>('unknown')));
  }
}
