import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, Subject, Subscription, of, takeUntil } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { AppService } from './app.service';
import { AppSettings } from "./types/app-settings";
import { Comparer } from './types/comparer';
import { EndPoint } from './types/end-point';
import { FilterItem } from './types/filter-item';
import { Property } from './types/property';
import { PropertyConverter } from './types/property-converter';
import { ValueConverter } from './types/value-converter';
import { RequestHeaders } from './types/request-headers';
import { CsdlProperty } from './types/csdl-property';
import { collectColumns, FlatRow, flattenRecord } from './utils/flatten';
import { keepVisibleColumns, withCombinedValue } from './utils/table-columns';
import { fieldDisplayName } from './utils/field-labels';
import { periodBounds } from './utils/period';
import { toDateTimeOffsetLiteral } from './utils/odata-value';
import { ErrorExplanation, explainResponse } from './utils/error-hints';
import { I18nService } from './i18n/i18n.service';
import { Lang, LANGS } from './utils/i18n';
import { SearchPreset } from './utils/code-lists';
import { CsvFormat, csvFileName, toCsv } from './utils/csv';
import { readCount, readNextLink, readRecords, withCount, withMinimumTop } from './utils/odata-url';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  destroySubscriptions$ = new Subject<void>();
  appSettings: AppSettings = { baseUrls: [], endPoints: [] };
  metaData!: CsdlProperty[];

  baseUrl: string = '';
  apiKey: string = 'xxxxxxxx';
  endPoint!: EndPoint;
  coordinateSystems: any[] = [
    {
      text: 'WGS 84',
      value: 'EPSG:3857'
    },
    {
      text: 'ETRS89',
      value: 'EPSG:4258'
    },
    {
      text: 'RD Old',
      value: 'EPSG:28991'
    },
    {
      text: 'RD New',
      value: 'EPSG:28992'
    },
  ]
  coordinateSystem: string = 'EPSG:4258';

  properties: Property[] = [];

  filterProperties!: Property[];
  filterItems: FilterItem[] = [];
  filterItemChange$: Subject<number> = new Subject<number>();

  pageSizeOptions: number[] = [1, 5, 10, 20, 50, 100, 500, 1000, 5000, 10000];
  pageSize: number = 10;

  count: string | null = null;

  selectProperties!: Property[];
  orderByProperties!: Property[];

  url!: string;
  nextUrl!: string | null;
  request$?: Subscription;
  requestHeaders: RequestHeaders | null = null;
  result: any | null = null;
  loadingResult: boolean = false;

  // Fetch all pages and CSV export
  maxRecordsOptions: number[] = [10000, 50000, 100000, 250000];
  maxRecords: number = 50000;
  csvFormats: { value: CsvFormat, textKey: string }[] = [
    { value: 'excel-nl', textKey: 'action.csvExcel' },
    { value: 'standard', textKey: 'action.csvStandard' }
  ];
  readonly langs: Lang[] = LANGS;

  // Simple search (observations)
  simpleFilter: string = '';
  simplePreset: (SearchPreset & { id: number }) | null = null;
  readonly simpleSearchPageSize: number = 100;
  csvFormat: CsvFormat = 'excel-nl';
  fetchingAll: boolean = false;
  fetchedCount: number = 0;
  totalCount: number | null = null;
  stoppedAtMaxRecords: boolean = false;
  showLargeJson: boolean = false;
  readonly largeResultThreshold: number = 1000;
  readonly fetchAllPageSize: number = 1000;
  private fetchAllRecords: unknown[] = [];

  // Table view of the result
  viewMode: 'table' | 'json' = 'table';
  tableRows: FlatRow[] = [];
  tableColumns: string[] = [];
  visibleColumns: string[] = [];
  tableSearch: string = '';
  tablePageSizeOptions: number[] = [25, 100, 500];
  dataSource = new MatTableDataSource<FlatRow>([]);

  // Period filter helper
  readonly periodPropertyName: string = 'PhenomenonTime/BeginPosition';
  periodFrom: string = '';
  periodTo: string = '';
  periodError: string | null = null;

  // Explanation of an error response
  hasRequested: boolean = false;
  problem: ErrorExplanation | null = null;

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

  propertyTypes: string[] = [
    'String',
    'DateTimeOffset',
    'DateTime',
    'Date',
    'Geography',
    'Double',
    'Decimal',
    'Int64',
    'Boolean'
  ];
  comparers: Comparer[] = [
    {
      value: 'eq',
      format: '<propertyformat> eq <valueformat>',
      propertyTypes: this.propertyTypes
    },
    {
      value: 'ne',
      format: '<propertyformat> ne <valueformat>',
      propertyTypes: this.propertyTypes
    },
    {
      value: 'gt',
      format: '<propertyformat> gt <valueformat>',
      propertyTypes: this.propertyTypes.filter(t => !['String', 'Geography', 'Boolean'].includes(t))
    },
    {
      value: 'ge',
      format: '<propertyformat> ge <valueformat>',
      propertyTypes: this.propertyTypes.filter(t => !['String', 'Geography', 'Boolean'].includes(t))
    },
    {
      value: 'lt',
      format: '<propertyformat> lt <valueformat>',
      propertyTypes: this.propertyTypes.filter(t => !['String', 'Geography', 'Boolean'].includes(t))
    },
    {
      value: 'le',
      format: '<propertyformat> le <valueformat>',
      propertyTypes: this.propertyTypes.filter(t => !['String', 'Geography', 'Boolean'].includes(t))
    },
    {
      value: 'in',
      format: '<propertyformat> in (<valueformat>)',
      propertyTypes: this.propertyTypes.filter(t => t == 'String')
    },
    {
      value: 'notin',
      format: '<propertyformat> notin (<valueformat>)',
      propertyTypes: this.propertyTypes.filter(t => t == 'String')
    },
    {
      value: 'has',
      format: 'has(<propertyformat>, <valueformat>)',
      propertyTypes: this.propertyTypes.filter(t => t == 'String')
    },
    {
      value: 'startswith',
      format: 'startswith(<propertyformat>, <valueformat>)',
      propertyTypes: this.propertyTypes.filter(t => t == 'String')
    },
    {
      value: 'endswith',
      format: 'endswith(<propertyformat>, <valueformat>)',
      propertyTypes: this.propertyTypes.filter(t => t == 'String')
    },
    {
      value: 'contains',
      format: 'contains(<propertyformat>, <valueformat>)',
      propertyTypes: this.propertyTypes.filter(t => t == 'String')
    }
  ];
  propertyConverters: PropertyConverter[] = [
    {
      value: 'tolower',
      format: 'tolower(<property>)',
      propertyType: 'String',
      inputType: null,
      outputType: 'String',
      inputPlaceholder: null
    },
    {
      value: 'toupper',
      format: 'toupper(<property>)',
      propertyType: 'String',
      inputType: null,
      outputType: 'String',
      inputPlaceholder: null
    },
    {
      value: 'day',
      format: 'day(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Int64',
      inputPlaceholder: null
    },
    {
      value: 'month',
      format: 'month(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Int64',
      inputPlaceholder: null
    },
    {
      value: 'year',
      format: 'year(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Int64',
      inputPlaceholder: null
    },
    {
      value: 'date',
      format: 'date(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Date',
      inputPlaceholder: null
    },
    {
      value: 'hour',
      format: 'hour(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Int64',
      inputPlaceholder: null
    },
    {
      value: 'minute',
      format: 'minute(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Int64',
      inputPlaceholder: null
    },
    {
      value: 'second',
      format: 'second(<property>)',
      propertyType: 'DateTimeOffset',
      inputType: null,
      outputType: 'Int64',
      inputPlaceholder: null
    },
    {
      value: 'distance',
      format: `distance(wkt='<propertyconverterinputvalue>')`,
      propertyType: 'Geography',
      inputType: 'text',
      outputType: 'Double',
      inputPlaceholder: 'WKT'
    },
    {
      value: 'intersect',
      format: `intersect(wkt='<propertyconverterinputvalue>')`,
      propertyType: 'Geography',
      inputType: 'text',
      outputType: 'Boolean',
      inputPlaceholder: 'WKT'
    }
  ];
  valueConverters: ValueConverter[] = [
    {
      value: 'tolower',
      format: 'tolower(<value>)',
      outputType: 'String',
      inputType: 'String',
      inputFormat: null
    },
    {
      value: 'toupper',
      format: 'toupper(<value>)',
      outputType: 'String',
      inputType: 'String',
      inputFormat: null
    },
    {
      value: 'day',
      format: 'day(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    },
    {
      value: 'month',
      format: 'month(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    },
    {
      value: 'year',
      format: 'year(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    },
    {
      value: 'date',
      format: 'date(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    },
    {
      value: 'hour',
      format: 'hour(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    },
    {
      value: 'minute',
      format: 'minute(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    },
    {
      value: 'second',
      format: 'second(<value>)',
      outputType: 'Int64',
      inputType: 'DateTimeOffset',
      inputFormat: null,
    }
  ];
  propertyConverterMapping: Record<string, PropertyConverter> = {};
  valueConverterMapping: Record<string, ValueConverter> = {};
  comparerMapping: Record<string, Comparer> = {};
  propertyTypeComparersMapping: Record<string, Comparer[]> = {};
  propertyTypePropertyConvertersMapping: Record<string, PropertyConverter[]> = {};
  outputTypeValueConvertersMapping: Record<string, ValueConverter[]> = {};
  inputTypeMapping: Record<string, string> = {};

  constructor(private service: AppService, public i18n: I18nService) { }

  //component
  ngOnInit(): void {
    this.setMappings();
    this.service.getAppSettings()
      .pipe(mergeMap(data => this.setBaseUrlAndApiKey(data)))
      .pipe(mergeMap(() => this.service.getMetaData(this.baseUrl, this.endPoint.property)))
      .subscribe((result) => this.setMetaData(result));
  }

  ngOnDestroy(): void {
    this.destroySubscriptions$.next();
    this.destroySubscriptions$.complete();
  }

  //set
  setMappings(): void {
    this.propertyConverters.forEach(q => this.propertyConverterMapping[q.value] = q);
    this.valueConverters.forEach(q => this.valueConverterMapping[q.value] = q);
    this.comparers.forEach(q => this.comparerMapping[q.value] = q);
    [...new Set(this.valueConverters.map(q => q.outputType))]
      .forEach(o => this.outputTypeValueConvertersMapping[o] = this.valueConverters
        .filter(q => q.outputType == o));

    this.propertyTypes.forEach(t => {
      this.propertyTypeComparersMapping[t] = this.comparers.filter(c => c.propertyTypes ? c.propertyTypes.includes(t) : true);
      this.propertyTypePropertyConvertersMapping[t] = this.propertyConverters.filter(c => c.propertyType == t);
      let inputType!: string;
      switch (t) {
        case 'DateTimeOffset':
        case 'DateTime':
          inputType = 'datetime-local'
          break;
        case 'Date':
          inputType = 'date'
          break;
        case 'Double':
        case 'Decimal':
        case 'Int64':
          inputType = 'number';
          break;
        case 'Boolean':
          inputType = 'checkbox';
          break;
        default:
          inputType = 'text';
      }
      this.inputTypeMapping[t] = inputType;
    });
  }

  setBaseUrlAndApiKey(appSettings: AppSettings): Observable<string> {
    this.appSettings = appSettings;
    const storedBaseUrl = localStorage.getItem('baseUrl');
    const storedApiKey = localStorage.getItem(storedBaseUrl ?? '');
    if (!storedBaseUrl) {
      this.baseUrl = appSettings.baseUrls.length > 0 ? appSettings.baseUrls[0] : '';
      localStorage.setItem('baseUrl', this.baseUrl);
    } else {
      this.baseUrl = storedBaseUrl;
    }

    if (!storedApiKey) {
      localStorage.setItem(this.baseUrl, this.apiKey);
    } else {
      this.apiKey = storedApiKey;
    }

    this.endPoint = appSettings.endPoints[0];
    this.result = { "@odata.context": this.baseUrl, "value": [], "@odata.nextLink": "" };
    this.requestHeaders = {
      headers: {
        'X-Api-Key': this.apiKey,
        'Accept-Crs': this.coordinateSystem
      }
    };
    return of(this.baseUrl);
  }

  setMetaData(metaData: any[]) {
    this.metaData = metaData;
    this.setProperties();
    this.generateUrl();
  }

  setProperties(): void {
    this.properties = [];
    let metaDataResultCopy = structuredClone(this.metaData);
    this.properties = metaDataResultCopy.map((csdlProperty: CsdlProperty) => this.expandProperties(csdlProperty));
    this.setFilterItems();
  }

  setFilterItems(): void {
    this.filterItems.push(new FilterItem({
      isArray: false,
      isKey: false,
      isNullable: true,
      isString: false,
      name: '',
      type: ''
    }))
    this.generateUrl();
  }

  //events
  onBaseUrlChange(args: any): void {
    this.apiKey = localStorage.getItem(this.baseUrl) ?? '';
    this.storeBaseUrlAndApiKey();
    this.service.getMetaData(this.baseUrl, this.endPoint.property)
      .subscribe((result) => this.setMetaData(result));
  }

  onApiKeyChange(args: any): void {
    this.requestHeaders = {
      headers: {
        'X-Api-Key': this.apiKey,
        'Accept-Crs': this.coordinateSystem
      }
    };
    this.storeBaseUrlAndApiKey();
  }

  onEndPointChange(args: any): void {
    this.service.getAppSettings()
      .pipe(mergeMap(() => this.service.getMetaData(this.baseUrl, this.endPoint.property)))
      .subscribe((result) => this.setMetaData(result));
    this.filterItems = [];
    this.generateUrl();
  }

  onCoordinateSystemChange(args: any): void {
    this.requestHeaders = {
      headers: {
        'X-Api-Key': this.apiKey,
        'Accept-Crs': this.coordinateSystem
      }
    };
    this.storeBaseUrlAndApiKey();
  }

  onFilterItemPropertyConverterChange(args: any, filterItem: FilterItem, index: number): void {
    filterItem.propertyConverter.data = this.propertyConverterMapping[args.value];
    if (filterItem.propertyConverter.data) {
      filterItem.propertyConverter.data.inputValue = null;
    }
    this.filterItemChange$.next(index);
    this.generateUrl();
  }

  onFilterItemPropertyChange(args: any, filterItem: FilterItem, index: number): void {
    filterItem = new FilterItem(args.value);
    this.filterItemChange$.next(index);
    this.generateUrl();
  }

  onFilterItemPropertyConverterInputValueChange(args: any, filterItem: FilterItem, index: number): void {
    this.filterItemChange$.next(index);
    this.generateUrl();
  }

  onFilterItemComparerChange(args: any, filterItem: FilterItem, index: number): void {
    filterItem.comparer.data = this.comparerMapping[args.value];
    this.filterItemChange$.next(index);
    this.generateUrl();
  }

  onFilterItemValueConverterChange(args: any, filterItem: FilterItem, index: number): void {
    filterItem.valueConverter.data = this.valueConverterMapping[args.value];
    this.filterItemChange$.next(index);
    this.generateUrl();
  }

  onFilterItemLogicalChange(args: any, filterItem: FilterItem, index: number): void {
    filterItem.logical = args.value;
    if (filterItem.logical != null && !this.filterItems[index + 1]) {
      this.filterItems.push(new FilterItem({
        isArray: false,
        isKey: false,
        isNullable: true,
        isString: false,
        name: '',
        type: ''
      }));
    }
    if (filterItem.logical == null) {
      this.filterItems.splice(index + 1, 1);
    }
    this.generateUrl();
  }

  emptyFilterItem(): FilterItem {
    return new FilterItem({
      isArray: false,
      isKey: false,
      isNullable: true,
      isString: false,
      name: '',
      type: ''
    });
  }

  /** Adds an empty filter row, joined to the previous row with 'and'. */
  addFilterItem(): void {
    const last = this.filterItems[this.filterItems.length - 1];
    if (last && last.logical == null) {
      last.logical = 'and';
    }
    this.filterItems.push(this.emptyFilterItem());
    this.generateUrl();
  }

  /** Removes a filter row. At least one (empty) row always remains. */
  removeFilterItem(index: number): void {
    const wasLast = index === this.filterItems.length - 1;
    this.filterItems.splice(index, 1);
    if (this.filterItems.length === 0) {
      this.filterItems.push(this.emptyFilterItem());
    } else if (wasLast) {
      this.filterItems[this.filterItems.length - 1].logical = null;
    }
    this.generateUrl();
  }

  /** Adds a filter row with a property, comparer and value already filled in. */
  appendFilterItem(property: Property, comparer: string, value: any): void {
    const item = new FilterItem(property);
    item.comparer = { value: comparer, data: this.comparerMapping[comparer] };
    item.value = value;
    const lastIndex = this.filterItems.length - 1;
    const last = this.filterItems[lastIndex];
    if (last && last.property.name === '') {
      this.filterItems[lastIndex] = item;
    } else {
      if (last && last.logical == null) {
        last.logical = 'and';
      }
      this.filterItems.push(item);
    }
  }

  get periodProperty(): Property | undefined {
    return this.properties.find(p => p.name === this.periodPropertyName);
  }

  /** Adds 'from' (ge) and 'to, inclusive' (lt next day) filters on the measurement time. */
  addPeriodFilter(): void {
    const property = this.periodProperty;
    if (!property) {
      return;
    }
    if (!this.periodFrom && !this.periodTo) {
      this.periodError = 'period.errorEmpty';
      return;
    }
    const bounds = periodBounds(this.periodFrom || null, this.periodTo || null);
    if (!bounds) {
      this.periodError = 'period.errorOrder';
      return;
    }
    this.periodError = null;
    if (bounds.from) {
      this.appendFilterItem(property, 'ge', bounds.from);
    }
    if (bounds.toExclusive) {
      this.appendFilterItem(property, 'lt', bounds.toExclusive);
    }
    this.generateUrl();
  }

  propertyDisplayName(property: Property): string {
    return fieldDisplayName(property.name, this.i18n.lang);
  }

  columnDisplayName(column: string): string {
    return fieldDisplayName(column, this.i18n.lang);
  }

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  problemText(part: 'title' | 'hint'): string {
    if (!this.problem) {
      return '';
    }
    const field = this.problem.field;
    return this.i18n.t(`${this.problem.key}.${part}`, {
      field: field ? fieldDisplayName(field, this.i18n.lang) : null,
      path: field,
      range: this.problem.range
    });
  }

  //functions
  expandProperties(csdlProperty: CsdlProperty): Property {
    var property = {
      isArray: false,
      isKey: false,
      isNullable: false,
      isString: false,
      name: csdlProperty.path,
      type: csdlProperty.edmType
    };
    this.formatProperty(property);
    return property;
  }

  formatProperty(property: Property): void {
    property.type = property.type.replace('Edm.', '');
  }

  storeBaseUrlAndApiKey(): void {
    localStorage.setItem('baseUrl', this.baseUrl);
    localStorage.setItem(this.baseUrl, this.apiKey);
  }

  generateUrl(): void {
    this.nextUrl = null;
    this.url = `${this.baseUrl}/${this.endPoint.url}?$top=${this.pageSize}`;
    if (this.count != null) {
      this.url += `&$count=${this.count}`;
    }

    if (this.selectProperties?.length > 0) {
      this.url += `&$select=${this.selectProperties.map(p => p.name).join(',')}`;
    }
    let validFilterItems = this.filterItems.filter((item, index) => this.validateFilterItem(item, index));
    let advancedFilter = '';
    if (validFilterItems?.length > 0) {
      validFilterItems.forEach((filterItem, index, all) => {
        let propertyFormat = filterItem.propertyConverter.data?.format ?? '<property>';
        let valueFormat = filterItem.valueConverter.data?.format ?? '<value>';
        let valueType = filterItem.propertyConverter.data?.outputType ?? filterItem.property.type;
        let value = this.formatFilterValue(filterItem.value, valueType);
        let filterUrl = filterItem.comparer.data.format.replace('<propertyformat>', propertyFormat.replace('<property>', filterItem.property.name).replace('<propertyconverterinputvalue>', filterItem.propertyConverter.data?.inputValue)).replace('<valueformat>', valueFormat.replace('<value>', value));
        advancedFilter += filterUrl;
        if (index < all.length - 1) {
          advancedFilter += ` ${filterItem.logical} `;
        }
      })
    }
    const simpleFilter = this.showSimpleSearch ? this.simpleFilter : '';
    const parts = [simpleFilter, simpleFilter && advancedFilter ? `(${advancedFilter})` : advancedFilter].filter(part => !!part);
    if (parts.length > 0) {
      this.url += '&$filter=' + parts.join(' and ');
    }
  }

  get showSimpleSearch(): boolean {
    return this.endPoint?.url === 'observations';
  }

  get showCodeLists(): boolean {
    return this.endPoint?.url === 'references';
  }

  /** Switches to the simple search for observations, with codes chosen in the code lists. */
  useInSimpleSearch(preset: SearchPreset): void {
    this.simplePreset = { ...preset, id: Date.now() };
    const observations = this.appSettings.endPoints.find(e => e.url === 'observations');
    if (observations && this.endPoint !== observations) {
      this.endPoint = observations;
      this.onEndPointChange(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSimpleFilterChange(filter: string): void {
    this.simpleFilter = filter;
    this.generateUrl();
  }

  /** Shows the first page of the simple search in the table. */
  showSimpleResults(): void {
    if (this.pageSize < this.simpleSearchPageSize) {
      this.pageSize = this.simpleSearchPageSize;
    }
    this.viewMode = 'table';
    this.generateUrl();
    this.get();
  }

  /** Fetches all observations of the simple search. */
  fetchAllSimpleResults(): void {
    this.viewMode = 'table';
    this.generateUrl();
    this.fetchAll();
  }

  formatFilterValue(value: any, valueType: string): any {
    switch (valueType) {
      case 'String':
        if ((value as string).indexOf(',') > 0) {
          return `'${(value as string).split(',').join("','")}'`;
        } else {
          return `'${value}'`;
        }
      case 'Geography':
        return `'${value}'`;
      case 'DateTimeOffset':
        return toDateTimeOffsetLiteral(String(value));
      case 'Int64':
        return `${Math.round(value)}`;
      default:
        return value;
    }
  }

  validateFilterItem(filterItem: FilterItem, index: number): boolean {
    let propertyConverterInputValid: boolean = true;
    if (filterItem.propertyConverter.value) {
      propertyConverterInputValid = filterItem.propertyConverter.data?.inputType ? filterItem.propertyConverter.data?.inputValue != null : true;
    }
    return propertyConverterInputValid && filterItem.comparer.value != null && filterItem.value != null && (index == this.filterItems.length - 1 || filterItem.logical != null);
  }

  //request
  get(): void {
    this.hasRequested = true;
    this.loadingResult = true;
    this.request$ = this.service
      .get(this.url, this.apiKey, this.coordinateSystem).pipe(takeUntil(this.destroySubscriptions$))
      .subscribe({
        next: (result: any) => {
          this.setSinglePageResult(result);
        },
        error: (error: any) => {
          console.log(error);
          this.result = { error: error };
          this.refreshTable();
          this.nextUrl = null;
          this.loadingResult = false;
        },
        complete: () => {
          this.loadingResult = false;
        }
      });
  }

  getNext(): void {
    if (this.nextUrl) {
      this.hasRequested = true;
      this.loadingResult = true;
      this.request$ = this.service
        .get(this.nextUrl, this.apiKey, this.coordinateSystem).pipe(takeUntil(this.destroySubscriptions$))
        .subscribe({
          next: (result: any) => {
            this.setSinglePageResult(result);
          },
          error: (error: any) => {
            this.result = { error: error };
            this.refreshTable();
            this.nextUrl = null;
            this.loadingResult = false;
          },
          complete: () => {
            this.loadingResult = false;
          }
        });
    }
  }

  cancel(): void {
    if (this.request$) {
      this.request$.unsubscribe();
      this.request$ = undefined;
      this.loadingResult = false;
      if (this.fetchingAll) {
        // Keep the records that were already fetched.
        this.finishFetchAll(null);
      } else {
        this.result = { "@odata.context": this.baseUrl, "value": [], "@odata.nextLink": "" };
        this.refreshTable();
      }
    }
  }

  setSinglePageResult(result: any): void {
    this.result = result;
    this.nextUrl = readNextLink(result);
    this.totalCount = readCount(result);
    this.stoppedAtMaxRecords = false;
    this.showLargeJson = false;
    this.refreshTable();
  }

  /** Rebuilds the flat table rows from the current result. */
  refreshTable(): void {
    this.problem = this.hasRequested ? explainResponse(this.result, !!this.apiKey) : null;
    this.tableRows = readRecords(this.result).map(record => withCombinedValue(flattenRecord(record)));
    this.tableColumns = collectColumns(this.tableRows);
    this.visibleColumns = keepVisibleColumns(this.visibleColumns, this.endPoint?.url ?? '', this.tableColumns);
    this.dataSource.data = this.tableRows;
    this.dataSource.filter = this.tableSearch.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  onTableSearchChange(): void {
    this.dataSource.filter = this.tableSearch.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  /**
   * Follows @odata.nextLink until all pages are fetched, or until the maximum number of
   * records is reached. The records are combined into one result, which can be exported.
   */
  fetchAll(): void {
    this.hasRequested = true;
    this.loadingResult = true;
    this.fetchingAll = true;
    this.fetchAllRecords = [];
    this.fetchedCount = 0;
    this.totalCount = null;
    this.stoppedAtMaxRecords = false;
    this.showLargeJson = false;
    this.fetchPage(withCount(withMinimumTop(this.url, this.fetchAllPageSize)));
  }

  private fetchPage(url: string): void {
    this.request$ = this.service
      .get(url, this.apiKey, this.coordinateSystem).pipe(takeUntil(this.destroySubscriptions$))
      .subscribe({
        next: (response: any) => {
          if (!response || response.error || !Array.isArray(response.value)) {
            this.finishFetchAll(response ?? { error: { message: 'Empty response from the service.' } });
            return;
          }
          this.fetchAllRecords.push(...readRecords(response));
          this.totalCount = readCount(response) ?? this.totalCount;
          const next = readNextLink(response);
          if (this.fetchAllRecords.length >= this.maxRecords) {
            this.stoppedAtMaxRecords = next != null || this.fetchAllRecords.length > this.maxRecords;
            this.fetchAllRecords.length = this.maxRecords;
            this.fetchedCount = this.fetchAllRecords.length;
            this.finishFetchAll(null);
          } else if (next) {
            this.fetchedCount = this.fetchAllRecords.length;
            this.fetchPage(next);
          } else {
            this.fetchedCount = this.fetchAllRecords.length;
            this.finishFetchAll(null);
          }
        },
        error: (error: any) => {
          this.finishFetchAll({ error: error });
        }
      });
  }

  private finishFetchAll(errorResponse: any | null): void {
    this.fetchingAll = false;
    this.loadingResult = false;
    this.nextUrl = null;
    if (errorResponse && this.fetchAllRecords.length === 0) {
      this.result = errorResponse;
      this.refreshTable();
      return;
    }
    this.result = {
      "@odata.context": this.baseUrl,
      "@odata.count": this.totalCount,
      "value": this.fetchAllRecords
    };
    if (errorResponse) {
      this.result.error = errorResponse.error ?? errorResponse;
    }
    this.refreshTable();
  }

  get resultRecordCount(): number {
    return readRecords(this.result).length;
  }

  get fetchProgressPercent(): number {
    if (!this.totalCount) {
      return 0;
    }
    return Math.min(100, Math.round(100 * this.fetchedCount / Math.min(this.totalCount, this.maxRecords)));
  }

  get hideLargeJson(): boolean {
    return this.resultRecordCount > this.largeResultThreshold && !this.showLargeJson;
  }

  downloadCsv(): void {
    if (this.tableRows.length === 0) {
      return;
    }
    const csv = toCsv(this.tableRows, this.tableColumns, { format: this.csvFormat });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = csvFileName(this.endPoint?.url ?? 'result');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

}
