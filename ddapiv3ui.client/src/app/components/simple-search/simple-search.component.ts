import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { AppService } from '../../app.service';
import { I18nService } from '../../i18n/i18n.service';
import { explainResponse } from '../../utils/error-hints';
import { Availability } from '../../utils/list-search';
import { readCount } from '../../utils/odata-url';
import {
  buildSimpleFilter, emptySimpleSearchState, isPeriodValid, odataString, PickerOption, SimpleSearchState
} from '../../utils/simple-search';
import { AvailabilityCheck, AvailabilityService } from './availability.service';
import { AvailabilityProgressInfo } from './reference-picker.component';
import { ReferenceListService } from './reference-list.service';

const ORGANISATION_KEY = 'simpleSearch.organisation';

type CountState =
  | { kind: 'none' }
  | { kind: 'needsOrganisation' }
  | { kind: 'counting' }
  | { kind: 'count', count: number }
  | { kind: 'failed', reasonKey: string };

/** A list whose options are checked for data at the chosen water authority. */
type FacetList = 'MeasurementPackage' | 'Compartment' | 'Quantity' | 'MeasurementObject' | 'Parameter';

const FACET_PATHS: Record<FacetList, string> = {
  MeasurementPackage: 'Parameter/MeasurementPackage',
  Compartment: 'Parameter/Compartment',
  Quantity: 'Parameter/Quantity',
  MeasurementObject: 'Foi/Code',
  Parameter: 'Parameter/Parameter'
};

interface FacetAvailability {
  states: Record<string, Availability> | null;
  progress: AvailabilityProgressInfo | null;
}

/**
 * Simple search for observations: labelled fields for the usual choices (water authority,
 * period, measurement package, compartment, quantity, location, taxon or parameter).
 * Emits the resulting $filter and shows how many observations match. Options are checked
 * for data, so that choices that give nothing are greyed out or hidden.
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
  organisationSelection: PickerOption[] = [];
  organisationAvailability: Record<string, Availability> | null = null;
  organisationProgress: AvailabilityProgressInfo | null = null;
  measurementPackages: PickerOption[] | null = null;
  compartments: PickerOption[] | null = null;
  quantities: PickerOption[] | null = null;
  measurementObjects: PickerOption[] | null = null;
  failed: Record<string, boolean> = {};
  facets: Record<FacetList, FacetAvailability> = SimpleSearchComponent.emptyFacets();
  countState: CountState = { kind: 'none' };

  readonly searchParameters = (text: string): Observable<PickerOption[]> =>
    this.references.search(this.baseUrl, this.apiKey, 'Parameter', text);

  private countRequests$ = new Subject<string>();
  private apiKeyChanges$ = new Subject<void>();
  private objectsSubscription?: Subscription;
  private organisationCheck?: Subscription;
  private facetChecks: Partial<Record<FacetList, Subscription>> = {};
  private destroy$ = new Subject<void>();

  constructor(
    private service: AppService,
    private references: ReferenceListService,
    private availability: AvailabilityService,
    public i18n: I18nService) { }

  ngOnInit(): void {
    this.countRequests$.pipe(
      debounceTime(700),
      switchMap(filter => this.countFor(filter)),
      takeUntil(this.destroy$)
    ).subscribe(state => this.countState = state);
    this.apiKeyChanges$.pipe(debounceTime(800), takeUntil(this.destroy$)).subscribe(() => {
      this.checkOrganisations();
      this.resetFacets();
      this.requestCount();
    });
    // Emit after the parent has finished its own change detection.
    Promise.resolve().then(() => this.changed());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['baseUrl'] && this.baseUrl) {
      this.loadLists();
    }
    if (changes['apiKey'] && !changes['apiKey'].firstChange) {
      this.apiKeyChanges$.next();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.objectsSubscription?.unsubscribe();
    this.organisationCheck?.unsubscribe();
    Object.values(this.facetChecks).forEach(s => s?.unsubscribe());
  }

  get periodError(): boolean {
    return !isPeriodValid(this.state);
  }

  get organisationHint(): string {
    if (!this.apiKey) {
      return this.i18n.t('simple.organisationNoKey');
    }
    const states = this.organisationAvailability;
    if (states && !(this.organisationProgress && this.organisationProgress.done < this.organisationProgress.total)) {
      return this.i18n.t('list.checked', { count: Object.values(states).filter(s => s === 'yes').length });
    }
    return '';
  }

  get objectsHint(): string {
    if (!this.state.organisation) {
      return this.i18n.t('simple.objectsNeedOrganisation');
    }
    return this.measurementObjects ? this.i18n.t('simple.objectsHint', { count: this.measurementObjects.length }) : '';
  }

  get facetHint(): string {
    return this.state.organisation && this.apiKey ? this.i18n.t('simple.availabilityHint') : '';
  }

  onOrganisationSelection(selection: PickerOption[]): void {
    const organisation = selection.length > 0 ? selection[selection.length - 1].value : null;
    this.state = { ...this.state, organisation, measurementObjects: [] };
    this.updateOrganisationSelection();
    try {
      if (organisation) {
        localStorage.setItem(ORGANISATION_KEY, organisation);
      } else {
        localStorage.removeItem(ORGANISATION_KEY);
      }
    } catch {
      // Storage can be unavailable; the choice then lasts for this page only.
    }
    this.resetFacets();
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

  /** Checks a whole (short) list when it is opened. */
  checkFacetList(list: FacetList, options: PickerOption[] | null): void {
    if (!options || this.facets[list].states) {
      return;
    }
    this.checkFacet(list, options);
  }

  /** Checks the options that are shown in a long list (locations, taxa). */
  checkShownOptions(list: FacetList, shown: PickerOption[]): void {
    if (shown.length > 0) {
      this.checkFacet(list, shown, true);
    }
  }

  private checkFacet(list: FacetList, options: PickerOption[], merge: boolean = false): void {
    const organisation = this.state.organisation;
    if (!organisation || !this.apiKey || !this.baseUrl) {
      return;
    }
    const base = `Parameter/Organisation eq ${odataString(organisation)}`;
    const checks: AvailabilityCheck[] = options.map(option => ({
      value: option.value,
      filter: `${base} and ${this.facetClause(list, option)}`
    }));
    const previous = merge ? (this.facets[list].states ?? {}) : {};
    this.facetChecks[list]?.unsubscribe();
    this.facetChecks[list] = this.availability.check(this.baseUrl, this.apiKey, checks).subscribe(progress => {
      this.facets = {
        ...this.facets,
        [list]: { states: { ...previous, ...progress.states }, progress: { done: progress.done, total: progress.total } }
      };
    });
  }

  private facetClause(list: FacetList, option: PickerOption): string {
    if (list === 'Parameter' && option.isTaxon) {
      return `startswith(Parameter/Parameter,${odataString(option.value)})`;
    }
    return `${FACET_PATHS[list]} eq ${odataString(option.value)}`;
  }

  private resetFacets(): void {
    Object.values(this.facetChecks).forEach(s => s?.unsubscribe());
    this.facetChecks = {};
    this.facets = SimpleSearchComponent.emptyFacets();
  }

  private checkOrganisations(): void {
    this.organisationCheck?.unsubscribe();
    this.organisationAvailability = null;
    this.organisationProgress = null;
    if (!this.apiKey || !this.organisations || !this.baseUrl) {
      return;
    }
    const checks = this.organisations.map(o => ({ value: o.value, filter: `Parameter/Organisation eq ${odataString(o.value)}` }));
    this.organisationCheck = this.availability.check(this.baseUrl, this.apiKey, checks, 6).subscribe(progress => {
      this.organisationAvailability = progress.states;
      this.organisationProgress = { done: progress.done, total: progress.total };
    });
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
        const explanation = explainResponse(response, !!this.apiKey);
        return { kind: 'failed', reasonKey: `${explanation?.key ?? 'error.general'}.title` };
      }),
      catchError((error: unknown) => {
        const explanation = explainResponse({ error }, !!this.apiKey);
        return of<CountState>({ kind: 'failed', reasonKey: `${explanation?.key ?? 'error.general'}.title` });
      }));
  }

  private loadLists(): void {
    const lists: [string, (options: PickerOption[] | null) => void][] = [
      ['Organisation', options => {
        this.organisations = options;
        this.updateOrganisationSelection();
        this.checkOrganisations();
      }],
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

  private updateOrganisationSelection(): void {
    const code = this.state.organisation;
    if (!code) {
      this.organisationSelection = [];
      return;
    }
    const option = (this.organisations ?? []).find(o => o.value === code);
    this.organisationSelection = [option ?? { value: code, label: code }];
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

  private static emptyFacets(): Record<FacetList, FacetAvailability> {
    const empty = (): FacetAvailability => ({ states: null, progress: null });
    return { MeasurementPackage: empty(), Compartment: empty(), Quantity: empty(), MeasurementObject: empty(), Parameter: empty() };
  }

  private static readStoredOrganisation(): string | null {
    try {
      return localStorage.getItem(ORGANISATION_KEY);
    } catch {
      return null;
    }
  }
}
