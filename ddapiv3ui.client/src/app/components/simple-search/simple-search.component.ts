import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { AppService } from '../../app.service';
import { I18nService } from '../../i18n/i18n.service';
import { explainResponse } from '../../utils/error-hints';
import { readCount } from '../../utils/odata-url';
import { buildSimpleFilter, emptySimpleSearchState, isPeriodValid, PickerOption, SimpleSearchState } from '../../utils/simple-search';
import { ReferenceListService } from './reference-list.service';

const ORGANISATION_KEY = 'simpleSearch.organisation';

type CountState =
  | { kind: 'none' }
  | { kind: 'needsOrganisation' }
  | { kind: 'counting' }
  | { kind: 'count', count: number }
  | { kind: 'failed', reasonKey: string };

/**
 * Simple search for observations: labelled fields for the usual choices (water authority,
 * period, measurement package, compartment, quantity, location, taxon or parameter).
 * Emits the resulting $filter and shows how many observations match.
 */
@Component({
  selector: 'app-simple-search',
  templateUrl: './simple-search.component.html',
  styleUrl: './simple-search.component.css'
})
export class SimpleSearchComponent implements OnInit, OnChanges, OnDestroy {
  @Input() baseUrl: string = '';
  @Input() apiKey: string = '';
  @Input() busy: boolean = false;
  @Output() filterChange = new EventEmitter<string>();
  @Output() show = new EventEmitter<void>();
  @Output() fetchAll = new EventEmitter<void>();

  state: SimpleSearchState = emptySimpleSearchState(SimpleSearchComponent.readStoredOrganisation());
  organisations: PickerOption[] | null = null;
  measurementPackages: PickerOption[] | null = null;
  compartments: PickerOption[] | null = null;
  quantities: PickerOption[] | null = null;
  measurementObjects: PickerOption[] | null = null;
  failed: Record<string, boolean> = {};
  countState: CountState = { kind: 'none' };

  readonly searchParameters = (text: string): Observable<PickerOption[]> =>
    this.references.search(this.baseUrl, this.apiKey, 'Parameter', text);

  private countRequests$ = new Subject<string>();
  private objectsSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(private service: AppService, private references: ReferenceListService, public i18n: I18nService) { }

  ngOnInit(): void {
    this.countRequests$.pipe(
      debounceTime(700),
      switchMap(filter => this.countFor(filter)),
      takeUntil(this.destroy$)
    ).subscribe(state => this.countState = state);
    // Emit after the parent has finished its own change detection.
    Promise.resolve().then(() => this.changed());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['baseUrl'] && this.baseUrl) {
      this.loadLists();
    }
    if (changes['apiKey'] && !changes['apiKey'].firstChange) {
      this.requestCount();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.objectsSubscription?.unsubscribe();
  }

  get periodError(): boolean {
    return !isPeriodValid(this.state);
  }

  get objectsHint(): string {
    if (!this.state.organisation) {
      return this.i18n.t('simple.objectsNeedOrganisation');
    }
    return this.measurementObjects ? this.i18n.t('simple.objectsHint', { count: this.measurementObjects.length }) : '';
  }

  onOrganisationChange(organisation: string | null): void {
    this.state = { ...this.state, organisation, measurementObjects: [] };
    try {
      if (organisation) {
        localStorage.setItem(ORGANISATION_KEY, organisation);
      } else {
        localStorage.removeItem(ORGANISATION_KEY);
      }
    } catch {
      // Storage can be unavailable; the choice then lasts for this page only.
    }
    this.loadMeasurementObjects();
    this.changed();
  }

  update(patch: Partial<SimpleSearchState>): void {
    this.state = { ...this.state, ...patch };
    this.changed();
  }

  clear(): void {
    this.state = emptySimpleSearchState(this.state.organisation);
    this.changed();
  }

  private changed(): void {
    const filter = buildSimpleFilter(isPeriodValid(this.state) ? this.state : { ...this.state, from: '', to: '' });
    this.filterChange.emit(filter);
    this.requestCount();
  }

  private requestCount(): void {
    if (!this.state.organisation) {
      this.countState = { kind: 'needsOrganisation' };
      return;
    }
    this.countState = { kind: 'counting' };
    this.countRequests$.next(buildSimpleFilter(isPeriodValid(this.state) ? this.state : { ...this.state, from: '', to: '' }));
  }

  private countFor(filter: string): Observable<CountState> {
    const url = `${this.baseUrl}/observations?$top=1&$count=true&$filter=${filter}`;
    return this.service.get(url, this.apiKey).pipe(
      map((response: any): CountState => {
        const count = readCount(response);
        if (count !== null) {
          return { kind: 'count', count };
        }
        const explanation = explainResponse(response);
        return { kind: 'failed', reasonKey: `${explanation?.key ?? 'error.general'}.title` };
      }),
      catchError((error: unknown) => {
        const explanation = explainResponse({ error });
        return of<CountState>({ kind: 'failed', reasonKey: `${explanation?.key ?? 'error.general'}.title` });
      }));
  }

  private loadLists(): void {
    const lists: [string, (options: PickerOption[] | null) => void][] = [
      ['Organisation', options => this.organisations = options],
      ['MeasurementPackage', options => this.measurementPackages = options],
      ['Compartment', options => this.compartments = options],
      ['Quantity', options => this.quantities = options]
    ];
    for (const [type, assign] of lists) {
      assign(null);
      this.references.list(this.baseUrl, this.apiKey, type)
        .pipe(takeUntil(this.destroy$))
        .subscribe(options => {
          this.failed[type] = options === null;
          assign(options);
        });
    }
    this.loadMeasurementObjects();
  }

  private loadMeasurementObjects(): void {
    this.objectsSubscription?.unsubscribe();
    this.measurementObjects = null;
    this.failed['MeasurementObject'] = false;
    if (!this.state.organisation || !this.baseUrl) {
      return;
    }
    this.objectsSubscription = this.references
      .list(this.baseUrl, this.apiKey, 'MeasurementObject', this.state.organisation)
      .subscribe(options => {
        this.failed['MeasurementObject'] = options === null;
        this.measurementObjects = options;
      });
  }

  private static readStoredOrganisation(): string | null {
    try {
      return localStorage.getItem(ORGANISATION_KEY);
    } catch {
      return null;
    }
  }
}
