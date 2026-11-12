import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { PickerOption, searchOptions } from '../../utils/simple-search';

/**
 * Multiple choice field with chips. The options appear as soon as the field gets focus
 * (local lists) and can be searched on name and code. For very large lists a search
 * function is used instead, which asks the server after a few characters.
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
  /** Local list of options; null while loading. */
  @Input() options: PickerOption[] | null = null;
  /** Server search for large lists; used instead of `options` when set. */
  @Input() search: ((text: string) => Observable<PickerOption[]>) | null = null;
  @Input() minSearchLength: number = 2;
  @Input() limit: number = 50;
  @Input() disabled: boolean = false;
  @Input() loadFailed: boolean = false;
  @Input() selected: PickerOption[] = [];
  @Output() selectedChange = new EventEmitter<PickerOption[]>();

  @ViewChild('textInput') textInput?: ElementRef<HTMLInputElement>;

  textControl = new FormControl<string | PickerOption>('');
  visible: PickerOption[] = [];
  totalMatches: number = 0;
  searching: boolean = false;
  private text: string = '';
  private destroy$ = new Subject<void>();

  constructor(public i18n: I18nService) { }

  ngOnInit(): void {
    this.textControl.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : ''),
      tap(text => this.text = text),
      debounceTime(this.search ? 300 : 0),
      distinctUntilChanged(),
      switchMap(text => this.optionsFor(text)),
      takeUntil(this.destroy$)
    ).subscribe(options => {
      this.searching = false;
      this.setVisible(options);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']) {
      if (this.disabled) {
        this.textControl.disable({ emitEvent: false });
      } else {
        this.textControl.enable({ emitEvent: false });
      }
    }
    if ((changes['options'] || changes['selected']) && !this.search) {
      this.setVisible(this.localMatches(this.text));
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

  select(event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value as PickerOption;
    if (!this.selected.some(s => s.value === option.value)) {
      this.selectedChange.emit([...this.selected, option]);
    }
    if (this.textInput) {
      this.textInput.nativeElement.value = '';
    }
    this.textControl.setValue('');
  }

  remove(option: PickerOption): void {
    this.selectedChange.emit(this.selected.filter(s => s.value !== option.value));
  }

  private optionsFor(text: string): Observable<PickerOption[]> {
    if (!this.search) {
      return of(this.localMatches(text));
    }
    if (text.trim().length < this.minSearchLength) {
      return of([]);
    }
    this.searching = true;
    return this.search(text).pipe(catchError(() => of([])));
  }

  private localMatches(text: string): PickerOption[] {
    const available = (this.options ?? []).filter(o => !this.selected.some(s => s.value === o.value));
    const all = searchOptions(available, text, available.length);
    this.totalMatches = all.length;
    return all.slice(0, this.limit);
  }

  private setVisible(options: PickerOption[]): void {
    this.visible = options.filter(o => !this.selected.some(s => s.value === o.value));
    if (this.search) {
      this.totalMatches = this.visible.length;
    }
  }
}
