import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import {
  Availability, groupByCodePrefix, highlightParts, matchOptions, orderByAvailability,
  rememberRecent, TextPart, withRecentFirst
} from '../../utils/list-search';
import { PickerOption } from '../../utils/simple-search';

export interface AvailabilityProgressInfo {
  done: number;
  total: number;
}

interface PickerAction {
  action: 'selectAll' | 'more' | 'toggleUnavailable';
}

interface Row {
  option: PickerOption;
  parts: TextPart[];
  state: Availability | null;
}

interface Section {
  label: string;
  rows: Row[];
}

function isAction(value: unknown): value is PickerAction {
  return value !== null && typeof value === 'object' && 'action' in (value as object);
}

/**
 * Choice field with chips for long lists. Options appear as soon as the field is opened
 * and can be searched with several words in any order (matching text in bold). Supports
 * "show more", "select all matches", recently used options, groups, and options marked
 * as having no data. For very large lists a server search function is used instead.
 */
@Component({
  selector: 'app-reference-picker',
  templateUrl: './reference-picker.component.html',
  styleUrl: './reference-picker.component.css'
})
export class ReferencePickerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() label: string = '';
  @Input() hint: string = '';
  @Input() placeholder: string = '';
  @Input() required: boolean = false;
  /** Allow several choices (chips); otherwise a new choice replaces the old one. */
  @Input() multiple: boolean = true;
  /** Local list of options; null while loading. */
  @Input() options: PickerOption[] | null = null;
  /** Server search for large lists; used instead of `options` when set. */
  @Input() search: ((text: string) => Observable<PickerOption[]>) | null = null;
  @Input() minSearchLength: number = 2;
  @Input() pageSize: number = 50;
  @Input() grouped: boolean = false;
  /** Key under which recently used values are remembered in the browser. */
  @Input() recentKey: string | null = null;
  /** Result of data checks per option value. */
  @Input() availability: Record<string, Availability> | null = null;
  @Input() availabilityProgress: AvailabilityProgressInfo | null = null;
  /** Hide options without data (with a way to show them), instead of greying them out. */
  @Input() hideUnavailable: boolean = false;
  @Input() disabled: boolean = false;
  @Input() loadFailed: boolean = false;
  @Input() selected: PickerOption[] = [];
  @Output() selectedChange = new EventEmitter<PickerOption[]>();
  /** The option list was opened (for checks that should only run when needed). */
  @Output() opened = new EventEmitter<void>();
  /** Options currently shown while the list is open (for checks on large lists). */
  @Output() shownOptions = new EventEmitter<PickerOption[]>();

  @ViewChild('textInput') textInput?: ElementRef<HTMLInputElement>;
  @ViewChild(MatAutocompleteTrigger) trigger?: MatAutocompleteTrigger;

  readonly selectAllAction: PickerAction = { action: 'selectAll' };
  readonly moreAction: PickerAction = { action: 'more' };
  readonly toggleUnavailableAction: PickerAction = { action: 'toggleUnavailable' };

  textControl = new FormControl<string | PickerOption | PickerAction>('');
  sections: Section[] = [];
  totalMatches: number = 0;
  moreCount: number = 0;
  selectAllCount: number = 0;
  hiddenUnavailable: number = 0;
  showUnavailable: boolean = false;
  searching: boolean = false;
  private text: string = '';
  private shown: number = 50;
  private remoteResults: PickerOption[] = [];
  private allMatches: PickerOption[] = [];
  private recent: string[] = [];
  private lastShown: string = '';
  private shownPage: PickerOption[] = [];
  private panelOpen: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(public i18n: I18nService) { }

  readonly displayFn = (value: unknown): string => isAction(value) ? this.text : '';

  ngOnInit(): void {
    this.shown = this.pageSize;
    this.recent = this.readRecent();
    const text$ = this.textControl.valueChanges.pipe(
      filter((value): value is string => typeof value === 'string'),
      takeUntil(this.destroy$));

    text$.subscribe(text => {
      this.text = text;
      this.shown = this.pageSize;
      if (!this.search) {
        this.rebuild();
      }
    });

    if (this.search) {
      text$.pipe(
        tap(text => this.searching = text.trim().length >= this.minSearchLength),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(text => this.searchRemote(text))
      ).subscribe(results => {
        this.searching = false;
        this.remoteResults = results;
        this.rebuild();
      });
    }
    this.rebuild();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']) {
      if (this.disabled) {
        this.textControl.disable({ emitEvent: false });
      } else {
        this.textControl.enable({ emitEvent: false });
      }
    }
    if (changes['options'] || changes['selected'] || changes['availability']) {
      this.rebuild();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isLoading(): boolean {
    return !this.search && this.options === null && !this.loadFailed && !this.disabled;
  }

  get needsMoreText(): boolean {
    return !!this.search && this.text.trim().length < this.minSearchLength;
  }

  get checking(): boolean {
    return !!this.availabilityProgress && this.availabilityProgress.done < this.availabilityProgress.total;
  }

  get checkingPercent(): number {
    const progress = this.availabilityProgress;
    return progress && progress.total > 0 ? Math.round(100 * progress.done / progress.total) : 0;
  }

  get rowCount(): number {
    return this.sections.reduce((sum, section) => sum + section.rows.length, 0);
  }

  onSelected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value as PickerOption | PickerAction;
    if (isAction(value)) {
      if (value.action === 'more') {
        this.shown += this.pageSize;
      } else if (value.action === 'toggleUnavailable') {
        this.showUnavailable = !this.showUnavailable;
      } else if (value.action === 'selectAll') {
        const usable = this.allMatches.filter(o => this.availability?.[o.value] !== 'no');
        this.choose(usable);
        return;
      }
      this.textControl.setValue(this.text, { emitEvent: false });
      if (this.textInput) {
        this.textInput.nativeElement.value = this.text;
      }
      this.rebuild();
      setTimeout(() => this.trigger?.openPanel());
      return;
    }
    this.choose([value]);
  }

  remove(option: PickerOption): void {
    this.selectedChange.emit(this.selected.filter(s => s.value !== option.value));
  }

  private choose(options: PickerOption[]): void {
    if (options.length === 0) {
      return;
    }
    if (this.multiple) {
      const added = options.filter(o => !this.selected.some(s => s.value === o.value));
      this.selectedChange.emit([...this.selected, ...added]);
    } else {
      this.selectedChange.emit([options[0]]);
    }
    this.recent = rememberRecent(this.recent, options.slice(0, 5).map(o => o.value));
    this.writeRecent();
    if (this.textInput) {
      this.textInput.nativeElement.value = '';
    }
    this.textControl.setValue('');
  }

  private searchRemote(text: string): Observable<PickerOption[]> {
    if (!this.search || text.trim().length < this.minSearchLength) {
      return of([]);
    }
    return this.search(text).pipe(catchError(() => of([])));
  }

  private rebuild(): void {
    const selected = new Set(this.selected.map(s => s.value));
    const source = (this.search ? this.remoteResults : (this.options ?? [])).filter(o => !selected.has(o.value));
    let matches = this.search ? source : matchOptions(source, this.text);
    matches = orderByAvailability(matches, this.availability);

    this.hiddenUnavailable = 0;
    if (this.hideUnavailable && this.availability && !this.showUnavailable) {
      const withData = matches.filter(o => this.availability?.[o.value] !== 'no');
      this.hiddenUnavailable = matches.length - withData.length;
      matches = withData;
    }
    this.allMatches = matches;
    this.totalMatches = matches.length;
    const usable = matches.filter(o => this.availability?.[o.value] !== 'no').length;
    this.selectAllCount = this.multiple && this.text.trim() && usable > 1 && usable <= 200 ? usable : 0;

    let rest = matches;
    const sections: Section[] = [];
    if (!this.text.trim() && this.recentKey && this.recent.length > 0 && !this.search) {
      const split = withRecentFirst(matches, this.recent);
      if (split.recent.length > 0) {
        sections.push({ label: this.i18n.t('list.recent'), rows: split.recent.map(o => this.row(o)) });
        rest = split.others;
      }
    }
    const page = rest.slice(0, this.shown);
    this.moreCount = Math.min(this.pageSize, rest.length - page.length);
    if (this.grouped && !this.text.trim()) {
      for (const group of groupByCodePrefix(page)) {
        sections.push({ label: group.label, rows: group.options.map(o => this.row(o)) });
      }
    } else {
      sections.push({ label: '', rows: page.map(o => this.row(o)) });
    }
    this.sections = sections;

    this.shownPage = page;
    this.emitShown(false);
  }

  onPanelOpened(): void {
    this.panelOpen = true;
    this.opened.emit();
    this.emitShown(true);
  }

  onPanelClosed(): void {
    this.panelOpen = false;
  }

  /** Tells the parent which options are shown, after the current change detection. */
  private emitShown(force: boolean): void {
    if (!this.panelOpen) {
      return;
    }
    const page = this.shownPage;
    const key = page.map(o => o.value).join('\n');
    if (!force && key === this.lastShown) {
      return;
    }
    this.lastShown = key;
    Promise.resolve().then(() => this.shownOptions.emit(page));
  }

  private row(option: PickerOption): Row {
    return {
      option,
      parts: highlightParts(option.label, this.text),
      state: this.availability?.[option.value] ?? null
    };
  }

  private readRecent(): string[] {
    if (!this.recentKey) {
      return [];
    }
    try {
      const stored = JSON.parse(localStorage.getItem(`recent.${this.recentKey}`) ?? '[]');
      return Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }

  private writeRecent(): void {
    if (!this.recentKey) {
      return;
    }
    try {
      localStorage.setItem(`recent.${this.recentKey}`, JSON.stringify(this.recent));
    } catch {
      // Storage can be unavailable; recent choices then last for this page only.
    }
  }
}
