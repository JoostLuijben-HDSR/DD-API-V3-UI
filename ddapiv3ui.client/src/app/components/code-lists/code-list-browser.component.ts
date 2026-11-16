import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import {
  CODE_LIST_GROUPS, CODE_LISTS, CodeListDefinition, CodeListGroup, filterCodeLists, groupName, latestVersions, listDescription,
  listName, networkLocations, referenceToRow, SearchPreset, searchRows
} from '../../utils/code-lists';
import { csvFileName, toCsv } from '../../utils/csv';
import { fieldLabel } from '../../utils/field-labels';
import { collectColumns, FlatRow } from '../../utils/flatten';
import { optionLabel, PickerOption } from '../../utils/simple-search';
import { MAX_REFERENCES, ReferenceListService } from '../simple-search/reference-list.service';

const ORGANISATION_KEY = 'simpleSearch.organisation';
/** Technical fields that are not shown in the details. */
const HIDDEN_DETAIL_FIELDS = ['Id', 'Type'];
/** Maximum number of shown rows that can be handed to the simple search at once. */
const MAX_USE_ALL = 500;

interface DetailField {
  name: string;
  label: string;
  value: string;
}

/**
 * Browser for the code lists (references): the lists on the left with their size, the
 * contents of the chosen list on the right with search, CSV download and details, and a
 * way to search observations with a chosen code.
 */
@Component({
  selector: 'app-code-list-browser',
  templateUrl: './code-list-browser.component.html',
  styleUrl: './code-list-browser.component.css'
})
export class CodeListBrowserComponent implements OnInit, OnChanges, OnDestroy {
  @Input() baseUrl: string = '';
  @Input() apiKey: string = '';
  @Output() useInSearch = new EventEmitter<SearchPreset>();

  readonly groups = CODE_LIST_GROUPS;
  listSearch: string = '';
  counts: Record<string, number | null> = {};
  selected: CodeListDefinition | null = null;
  organisations: PickerOption[] | null = null;
  organisation: string | null = CodeListBrowserComponent.readStoredOrganisation();
  organisationSelection: PickerOption[] = [];
  rowSearch: string = '';
  loading: boolean = false;
  failed: boolean = false;
  truncated: boolean = false;
  shownRows: FlatRow[] = [];
  totalRows: number = 0;
  mergedVersions: number = 0;
  dataSource = new MatTableDataSource<FlatRow>([]);
  detail: { row: FlatRow, record: unknown, fields: DetailField[] } | null = null;

  private allRows: FlatRow[] = [];
  private rowRecords = new Map<FlatRow, unknown>();
  private rowSearch$ = new Subject<string>();
  private loadSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) set tablePaginator(paginator: MatPaginator | undefined) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  @ViewChild(MatSort) set tableSort(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  constructor(private references: ReferenceListService, public i18n: I18nService) { }

  ngOnInit(): void {
    this.rowSearch$.pipe(debounceTime(250), takeUntil(this.destroy$)).subscribe(() => {
      if (this.selected?.serverSearch) {
        this.loadRows();
      } else {
        this.applyRowSearch();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['baseUrl'] && this.baseUrl) {
      this.loadCounts();
      this.references.list(this.baseUrl, this.apiKey, 'Organisation')
        .pipe(takeUntil(this.destroy$))
        .subscribe(options => {
          this.organisations = options;
          this.updateOrganisationSelection();
        });
      if (this.selected) {
        this.loadRows();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loadSubscription?.unsubscribe();
  }

  listsIn(group: CodeListGroup): CodeListDefinition[] {
    return filterCodeLists(CODE_LISTS.filter(l => l.group === group), this.listSearch, this.i18n.lang);
  }

  groupLabel(group: CodeListGroup): string {
    return groupName(group, this.i18n.lang);
  }

  name(list: CodeListDefinition): string {
    return listName(list, this.i18n.lang);
  }

  description(list: CodeListDefinition): string {
    return listDescription(list, this.i18n.lang);
  }

  columnLabel(column: string): string {
    return fieldLabel(column, this.i18n.lang) ?? column;
  }

  get columns(): string[] {
    return this.selected?.columns ?? [];
  }

  get needsOrganisation(): boolean {
    return !!this.selected?.byOrganisation && !this.organisation;
  }

  get needsSearchText(): boolean {
    return !!this.selected?.serverSearch && this.rowSearch.trim().length < 2;
  }

  get canUseAll(): boolean {
    const use = this.selected?.useInSearch;
    return !!use && use !== 'organisation' && use !== 'monitoringNetwork'
      && !!this.rowSearch.trim() && this.shownRows.length > 1 && this.shownRows.length <= MAX_USE_ALL;
  }

  select(list: CodeListDefinition): void {
    this.selected = list;
    this.detail = null;
    this.rowSearch = '';
    this.loadRows();
  }

  onListSearch(text: string): void {
    this.listSearch = text;
  }

  onRowSearch(text: string): void {
    this.rowSearch = text;
    this.rowSearch$.next(text);
  }

  onOrganisation(selection: PickerOption[]): void {
    this.organisation = selection.length > 0 ? selection[selection.length - 1].value : null;
    this.updateOrganisationSelection();
    try {
      if (this.organisation) {
        localStorage.setItem(ORGANISATION_KEY, this.organisation);
      }
    } catch {
      // Storage can be unavailable; the choice then lasts for this page only.
    }
    if (this.selected?.byOrganisation) {
      this.detail = null;
      this.loadRows();
    }
  }

  openDetail(row: FlatRow): void {
    const fields: DetailField[] = Object.entries(row)
      .filter(([name, value]) => value !== null && value !== '' && !HIDDEN_DETAIL_FIELDS.includes(name))
      .map(([name, value]) => ({ name, label: fieldLabel(name, this.i18n.lang) ?? name, value: String(value) }));
    this.detail = { row, record: this.rowRecords.get(row), fields };
  }

  closeDetail(): void {
    this.detail = null;
  }

  /** Text of the button that searches observations with the code in the detail panel. */
  useOneLabel(): string {
    if (!this.detail || !this.selected?.useInSearch) {
      return '';
    }
    if (this.selected.useInSearch === 'monitoringNetwork') {
      return this.i18n.t('codes.useNetwork', { count: networkLocations(this.detail.record).length });
    }
    return this.i18n.t('codes.useOne', { name: String(this.detail.row['Name'] ?? this.detail.row['Code'] ?? '') });
  }

  useOne(): void {
    const use = this.selected?.useInSearch;
    if (!this.detail || !use) {
      return;
    }
    if (use === 'monitoringNetwork') {
      const options = networkLocations(this.detail.record).map(code => ({ value: code, label: code }));
      this.useInSearch.emit({ use: 'measurementObjects', options, organisation: this.organisation });
      return;
    }
    const option = this.toOption(this.detail.row);
    this.useInSearch.emit({
      use,
      options: [option],
      organisation: use === 'organisation' ? option.value : (this.selected?.byOrganisation ? this.organisation : null)
    });
  }

  useAllShown(): void {
    const use = this.selected?.useInSearch;
    if (!use || !this.canUseAll) {
      return;
    }
    this.useInSearch.emit({
      use,
      options: this.shownRows.map(row => this.toOption(row)),
      organisation: this.selected?.byOrganisation ? this.organisation : null
    });
  }

  downloadCsv(): void {
    if (!this.selected || this.shownRows.length === 0) {
      return;
    }
    const columns = [...this.columns, ...collectColumns(this.shownRows).filter(c => !this.columns.includes(c))];
    const csv = toCsv(this.shownRows, columns, { format: 'excel-nl' });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = csvFileName(this.selected.type + (this.selected.byOrganisation && this.organisation ? '-' + this.organisation : ''));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  private toOption(row: FlatRow): { value: string, label: string, isTaxon?: boolean } {
    const code = String(row['Code'] ?? '');
    const name = typeof row['Name'] === 'string' ? row['Name'] as string : '';
    const option: { value: string, label: string, isTaxon?: boolean } = { value: code, label: optionLabel(code, name) };
    if (typeof row['ParameterType'] === 'string') {
      option.isTaxon = (row['ParameterType'] as string).toLowerCase() === 'taxon';
    }
    return option;
  }

  private loadCounts(): void {
    for (const list of CODE_LISTS) {
      this.references.count(this.baseUrl, this.apiKey, list.type)
        .pipe(takeUntil(this.destroy$))
        .subscribe(count => this.counts = { ...this.counts, [list.type]: count });
    }
  }

  private loadRows(): void {
    this.loadSubscription?.unsubscribe();
    this.setRows([]);
    this.failed = false;
    this.truncated = false;
    this.mergedVersions = 0;
    this.loading = false;
    const list = this.selected;
    if (!list || !this.baseUrl || this.needsOrganisation || this.needsSearchText) {
      return;
    }
    this.loading = true;
    const source = list.serverSearch
      ? this.references.searchRecords(this.baseUrl, this.apiKey, list.type, this.rowSearch)
      : this.references.records(this.baseUrl, this.apiKey, list.type, list.byOrganisation ? this.organisation : null);
    this.loadSubscription = source.pipe(takeUntil(this.destroy$)).subscribe(records => {
      this.loading = false;
      if (records === null) {
        this.failed = true;
        return;
      }
      this.truncated = !list.serverSearch && records.length >= MAX_REFERENCES;
      this.rowRecords.clear();
      const unique = latestVersions(records);
      this.mergedVersions = records.length - unique.length;
      const rows = unique.map(record => {
        const row = referenceToRow(record);
        this.rowRecords.set(row, record);
        return row;
      });
      this.setRows(rows);
    });
  }

  private setRows(rows: FlatRow[]): void {
    this.allRows = rows;
    this.totalRows = rows.length;
    this.applyRowSearch();
  }

  private applyRowSearch(): void {
    const searchColumns = [...new Set([...this.columns, 'Code', 'Name'])];
    this.shownRows = this.selected?.serverSearch ? this.allRows : searchRows(this.allRows, searchColumns, this.rowSearch);
    this.dataSource.data = this.shownRows;
    this.dataSource.paginator?.firstPage();
  }

  private updateOrganisationSelection(): void {
    if (!this.organisation) {
      this.organisationSelection = [];
      return;
    }
    const option = (this.organisations ?? []).find(o => o.value === this.organisation);
    this.organisationSelection = [option ?? { value: this.organisation, label: this.organisation }];
  }

  private static readStoredOrganisation(): string | null {
    try {
      return localStorage.getItem(ORGANISATION_KEY);
    } catch {
      return null;
    }
  }
}
