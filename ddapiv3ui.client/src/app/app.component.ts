import { Component, OnDestroy, OnInit } from '@angular/core';
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
  apiKey: string = '';
  showApiKey = false;
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

  constructor(private service: AppService) { }

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
    appSettings.baseUrls.forEach(url => localStorage.removeItem(url)); // API keys used to be stored here
    const storedBaseUrl = localStorage.getItem('baseUrl');
    const storedApiKey = sessionStorage.getItem(storedBaseUrl ?? '');
    if (!storedBaseUrl) {
      this.baseUrl = appSettings.baseUrls.length > 0 ? appSettings.baseUrls[0] : '';
      localStorage.setItem('baseUrl', this.baseUrl);
    } else {
      this.baseUrl = storedBaseUrl;
    }

    if (!storedApiKey) {
      sessionStorage.setItem(this.baseUrl, this.apiKey);
    } else {
      this.apiKey = storedApiKey;
    }

    this.endPoint = appSettings.endPoints[0];
    this.result = { "@odata.context": this.baseUrl, "value": [], "@odata.nextLink": "" };
    this.requestHeaders = {
      headers: {
        'X-Api-Key': this.apiKey ? '********' : '',
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
    this.apiKey = sessionStorage.getItem(this.baseUrl) ?? '';
    this.showApiKey = false;
    this.onApiKeyChange(this.apiKey);
    this.service.getMetaData(this.baseUrl, this.endPoint.property)
      .subscribe((result) => this.setMetaData(result));
  }

  onApiKeyChange(args: any): void {
    this.requestHeaders = {
      headers: {
        'X-Api-Key': this.apiKey ? '********' : '',
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
        'X-Api-Key': this.apiKey ? '********' : '',
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
    sessionStorage.setItem(this.baseUrl, this.apiKey);
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
    if (validFilterItems?.length > 0) {
      this.url += '&$filter=';
      validFilterItems.forEach((filterItem, index, all) => {
        let propertyFormat = filterItem.propertyConverter.data?.format ?? '<property>';
        let valueFormat = filterItem.valueConverter.data?.format ?? '<value>';
        let valueType = filterItem.propertyConverter.data?.outputType ?? filterItem.property.type;
        let value = this.formatFilterValue(filterItem.value, valueType);
        let filterUrl = filterItem.comparer.data.format.replace('<propertyformat>', propertyFormat.replace('<property>', filterItem.property.name).replace('<propertyconverterinputvalue>', filterItem.propertyConverter.data?.inputValue)).replace('<valueformat>', valueFormat.replace('<value>', value));
        this.url += filterUrl;
        if (index < all.length - 1) {
          this.url += ` ${filterItem.logical} `;
        }
      })
    }
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
        return `${value}Z`;
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
    this.loadingResult = true;
    this.request$ = this.service
      .get(this.url, this.apiKey, this.coordinateSystem).pipe(takeUntil(this.destroySubscriptions$))
      .subscribe({
        next: (result: any) => {
          this.result = result;
          this.nextUrl = result['@odata.nextLink'];
        },
        error: (error: any) => {
          console.log(error);
          this.result = { error: error };
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
      this.loadingResult = true;
      this.request$ = this.service
        .get(this.nextUrl, this.apiKey, this.coordinateSystem).pipe(takeUntil(this.destroySubscriptions$))
        .subscribe({
          next: (result: any) => {
            this.result = result;
            this.nextUrl = result['@odata.nextLink'];
          },
          error: (error: any) => {
            this.result = { error: error };
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
      this.result = { "@odata.context": this.baseUrl, "value": [], "@odata.nextLink": "" };
    }
  }

}
