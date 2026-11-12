import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject } from 'rxjs';

import { FilterItemValueComponent } from './filter-item-value.component';
import { FilterItem } from '../../types/filter-item';

describe('FilterItemValueComponent', () => {
  let component: FilterItemValueComponent;
  let fixture: ComponentFixture<FilterItemValueComponent>;

  function createFilterItem(type: string): FilterItem {
    return new FilterItem({
      isArray: false,
      isKey: false,
      isNullable: true,
      isString: type === 'String',
      name: 'Parameter/Quantity',
      type: type
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilterItemValueComponent],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        NoopAnimationsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterItemValueComponent);
    component = fixture.componentInstance;
    component.filterItemIndex = 0;
    component.baseUrl = 'https://example.org/v3/odata';
    component.apiKey = '';
    component.endPoint = 'observations';
    component.inputTypeMapping = { String: 'text', Double: 'number', DateTimeOffset: 'datetime-local' };
    component.filterItemChange$ = new Subject<number>();
  });

  it('should create', () => {
    component.filterItem = createFilterItem('String');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('uses suggestions for text compared with eq', () => {
    component.filterItem = createFilterItem('String');
    fixture.detectChanges();
    expect(component.inputType).toBe('autocomplete');
    expect(component.referenceType).toBe('Quantity');
  });

  it('uses a number input for numeric properties', () => {
    component.filterItem = createFilterItem('Double');
    fixture.detectChanges();
    expect(component.inputType).toBe('number');
  });
});
