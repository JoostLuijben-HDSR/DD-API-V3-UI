import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { Availability, groupByCodePrefix, highlightParts, matchOptions, orderByAvailability, TextPart } from '../../utils/list-search';
import { PickerOption } from '../../utils/simple-search';

export interface PickerDialogData {
  title: string;
  hint: string;
  multiple: boolean;
  grouped: boolean;
  hideUnavailable: boolean;
  /** Local list (null while loading); not used when `search` is set. */
  options$: Observable<PickerOption[] | null>;
  /** Server search for very large lists. */
  search: ((text: string) => Observable<PickerOption[]>) | null;
  minSearchLength: number;
  selected: PickerOption[];
  /** Results of data checks, updated while the window is open. */
  availability$: Observable<Record<string, Availability> | null>;
  /** Asks the owner to check options for data. */
  requestCheck: (options: PickerOption[]) => void;
}

interface Item {
  key: string;
  header: string | null;
  /** For header rows an empty placeholder, so templates never deal with null. */
  option: PickerOption;
  parts: TextPart[];
}

const HEADER_OPTION: PickerOption = { value: '', label: '' };

/** Maximum number of options sent for a data check at once. */
const CHECK_LIMIT = 100;

/**
 * Large window for choosing from long lists: a search field, a scrolling list with
 * checkboxes (also for thousands of options), "select all", and the chosen options on
 * the right. Changes are only applied with the Apply button.
 */
@Component({
  selector: 'app-picker-dialog',
  templateUrl: './picker-dialog.component.html',
  styleUrl: './picker-dialog.component.css'
})
export class PickerDialogComponent implements OnInit, OnDestroy {
  searchControl = new FormControl<string>('', { nonNullable: true });
  chosen: PickerOption[];
  items: Item[] = [];
  matchCount: number = 0;
  usableCount: number = 0;
  hiddenUnavailable: number = 0;
  showUnavailable: boolean = false;
  searching: boolean = false;
  isLoading: boolean = false;
  availability: Record<string, Availability> | null = null;
  private matches: PickerOption[] = [];
  private lastCheckKey: string = '';
  private showUnavailable$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PickerDialogData,
    private dialogRef: MatDialogRef<PickerDialogComponent, PickerOption[]>,
    public i18n: I18nService) {
    this.chosen = [...data.selected];
  }

  ngOnInit(): void {
    const text$ = this.searchControl.valueChanges.pipe(startWith(this.searchControl.value));
    const source$: Observable<PickerOption[] | null> = this.data.search
      ? text$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(text => this.searching = text.trim().length >= this.data.minSearchLength),
        switchMap(text => this.searchRemote(text)))
      : this.data.options$;

    combineLatest([source$, text$, this.data.availability$, this.showUnavailable$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([options, text, availability, showUnavailable]) => {
        this.searching = false;
        this.isLoading = options === null;
        this.availability = availability;
        this.showUnavailable = showUnavailable;
        this.rebuild(options ?? [], text, availability, showUnavailable);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get needsMoreText(): boolean {
    return !!this.data.search && this.searchControl.value.trim().length < this.data.minSearchLength;
  }

  availabilityOf(option: PickerOption): Availability | null {
    return this.availability?.[option.value] ?? null;
  }

  isChosen(option: PickerOption): boolean {
    return this.chosen.some(c => c.value === option.value);
  }

  toggle(option: PickerOption, checked: boolean): void {
    if (!this.data.multiple) {
      this.chosen = [option];
      this.apply();
      return;
    }
    this.chosen = checked
      ? [...this.chosen.filter(c => c.value !== option.value), option]
      : this.chosen.filter(c => c.value !== option.value);
  }

  selectAllMatches(): void {
    const usable = this.matches.filter(o => this.availability?.[o.value] !== 'no');
    const known = new Set(this.chosen.map(c => c.value));
    this.chosen = [...this.chosen, ...usable.filter(o => !known.has(o.value))];
  }

  remove(option: PickerOption): void {
    this.chosen = this.chosen.filter(c => c.value !== option.value);
  }

  clearChosen(): void {
    this.chosen = [];
  }

  toggleUnavailable(): void {
    this.showUnavailable$.next(!this.showUnavailable);
  }

  apply(): void {
    this.dialogRef.close(this.chosen);
  }

  trackItem(_index: number, item: Item): string {
    return item.key;
  }

  private searchRemote(text: string): Observable<PickerOption[]> {
    if (!this.data.search || text.trim().length < this.data.minSearchLength) {
      return of([]);
    }
    return this.data.search(text).pipe(catchError(() => of([])));
  }

  private rebuild(source: PickerOption[], text: string, availability: Record<string, Availability> | null, showUnavailable: boolean): void {
    let matches = this.data.search ? source : matchOptions(source, text);
    matches = orderByAvailability(matches, availability);
    this.hiddenUnavailable = 0;
    if (this.data.hideUnavailable && availability && !showUnavailable) {
      const withData = matches.filter(o => availability[o.value] !== 'no');
      this.hiddenUnavailable = matches.length - withData.length;
      matches = withData;
    }
    this.matches = matches;
    this.matchCount = matches.length;
    this.usableCount = matches.filter(o => availability?.[o.value] !== 'no').length;

    const items: Item[] = [];
    const add = (option: PickerOption) =>
      items.push({ key: 'o:' + option.value, header: null, option, parts: highlightParts(option.label, text) });
    if (this.data.grouped && !text.trim()) {
      for (const group of groupByCodePrefix(matches)) {
        if (group.label) {
          items.push({ key: 'h:' + group.label, header: group.label, option: HEADER_OPTION, parts: [] });
        }
        group.options.forEach(add);
      }
    } else {
      matches.forEach(add);
    }
    this.items = items;

    // Ask for data checks when the set of matches changes (not when only the results change).
    const toCheck = matches.slice(0, CHECK_LIMIT);
    const checkKey = toCheck.map(o => o.value).sort().join('|');
    if (checkKey && checkKey !== this.lastCheckKey) {
      this.lastCheckKey = checkKey;
      Promise.resolve().then(() => this.data.requestCheck(toCheck));
    }
  }
}
