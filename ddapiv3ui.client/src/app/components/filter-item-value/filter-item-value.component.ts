import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of, startWith, filter, debounceTime, distinctUntilChanged, switchMap, map, Subject, takeUntil } from 'rxjs';
import { AppService } from '../../app.service';
import { FilterItem } from '../../types/filter-item';
import { ReferenceOption, toReferenceOptions } from '../../utils/reference-option';

@Component({
  selector: 'app-filter-item-value',
  templateUrl: './filter-item-value.component.html',
  styleUrl: './filter-item-value.component.css'
})
export class FilterItemValueComponent {

  constructor(private service: AppService) { }

  @Input() filterItem!: FilterItem;
  @Input() filterItemIndex!: number;
  @Input() baseUrl!: string;
  @Input() apiKey!: string;
  @Input() endPoint!: string;
  @Input() inputTypeMapping!: any;
  @Input() filterItemChange$!: Subject<number>;
  @Input() valueLabel: string = 'Value';
  @Output() valueChange: EventEmitter<any> = new EventEmitter<any>();  

  destroySubscriptions$ = new Subject<void>();
  autoCompleteFormControl = new FormControl<string>('');
  multiSelectFormControl = new FormControl<string>('');
  valueOptions$!: Observable<ReferenceOption[]>;
  referenceType!: string;
  property: string = 'Code';
  valueType!: string;
  inputType!: string;

  ngOnInit(): void {
    this.handleQueryItemChange();
    this.setValueType();
    this.setInputType('');
    this.setReferenceType();  
  }

  ngOnDestroy(): void {
    this.destroySubscriptions$.next();
    this.destroySubscriptions$.complete();
  }

  //handle
  handleQueryItemChange(): void {
    this.filterItemChange$.pipe(takeUntil(this.destroySubscriptions$)).subscribe(queryItemIndex => {
      if (queryItemIndex == this.filterItemIndex) {
        var currentInputType = this.inputType;
        this.setValueType();
        this.setInputType(currentInputType);
        this.setReferenceType();
      }
    })
  }  

  //set
  setValueType(): void {
    this.valueType = this.filterItem.valueConverter.data?.inputType ?? (this.filterItem.propertyConverter.data?.outputType ?? this.filterItem.property.type);
  }

  setInputType(currentInputType: string): void {
    this.inputType = this.inputTypeMapping[this.valueType];
    if (this.valueType == 'String') {
      if (['eq', 'ne'].includes(this.filterItem.comparer.value)) {
        this.inputType = 'autocomplete';
        if (this.inputType != currentInputType) {
          this.setValueOptions();
        }
      }
      if (['in', 'notin'].includes(this.filterItem.comparer.value)) {
        this.inputType = 'multiselect';
        if (this.inputType != currentInputType) {
          this.setValueOptions();
        }
      }
    }    
  }

  setReferenceType(): void {
    this.referenceType = this.filterItem.property.name.split('/').reverse()[0];
    if (this.filterItem.property.name.split('/')[0] === 'Foi') {
      this.referenceType = 'MeasurementObject';
      this.property = this.filterItem.property.name.split('/').reverse()[0];
    }
  }

  setValueOptions(): void {
    if (this.inputType == 'autocomplete') {
      this.valueOptions$ = this.autoCompleteFormControl.valueChanges.pipe(
        startWith(''),
        filter(value => typeof value === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          this.filterItem.value = value;
          this.valueChange.emit(this.filterItem.value);
          if ((value as string).length > 0) {
            return this.service.get(this.getUrl(this.filterItem.value), this.apiKey).pipe(map(result => {
              return toReferenceOptions(result?.value, this.property);
            }));
          } else {
            return of([]);
          }         
        })
      )
    }

    if (this.inputType == 'multiselect') {
      this.valueOptions$ = this.multiSelectFormControl.valueChanges.pipe(
        startWith(''),
        filter(value => typeof value === 'string'),
        debounceTime(300),
        distinctUntilChanged(),
        filter(value => (value as string).split(',').reverse()[0].length >= 1),
        switchMap(value => {
          this.filterItem.value = value;
          this.valueChange.emit(this.filterItem.value);
          var filter = value?.split(',').reverse()[0].trim() ?? '';
          return this.service.get(this.getUrl(filter), this.apiKey).pipe(map(result => {
            return toReferenceOptions(result?.value, this.property);
          }));
        })
      )
    }    
  }

  //events
  onAutoCompleteOptionSelected(args: any): void {
      //this.filterItem.value = args.Code;
      //this.valueChange.emit(this.filterItem.value);
  }

  onMultiSelectSelectionChange(option: any, args: any): void {
    if (args.isUserInput) {
      var selectedOptions = this.filterItem.value.split(',');
      if (selectedOptions.length > 0) {
        var lastIndex = selectedOptions.length - 1;
        selectedOptions[lastIndex] = option;
        selectedOptions.join(',');
        this.multiSelectFormControl.setValue(selectedOptions.join(','));
      }
    }
  }

  onValueChange(args: any): void {
    this.valueChange.emit(this.filterItem.value);
  }

  //functions
  getUrl(value: string): string {
    var url = `${this.baseUrl}/references?$top=10`;
    switch (this.endPoint) {
      case 'observations':
        url += `&$filter=Type eq '${this.referenceType}' and startswith(tolower(${this.property}),'${value.toLowerCase()}')`;
        break;
      case 'references':
        if (this.filterItem.property.name == 'Type') {
          url += `&$filter=Type eq '' and startswith(tolower(Code),tolower('${value}'))`;
        } else {
          url += `&$filter=startswith(tolower(${this.property}),tolower('${value}'))`;
        }
        break;
    }
    return url;
  }

}
