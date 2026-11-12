import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FilterItemValueComponent } from './components/filter-item-value/filter-item-value.component';
import { TranslatePipe } from './i18n/translate.pipe';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PickerDialogComponent } from './components/simple-search/picker-dialog.component';
import { CodeListBrowserComponent } from './components/code-lists/code-list-browser.component';
import { ReferencePickerComponent } from './components/simple-search/reference-picker.component';
import { SimpleSearchComponent } from './components/simple-search/simple-search.component';
import { TranslatedPaginatorIntl } from './i18n/translated-paginator-intl';
import { MatExpansionModule } from '@angular/material/expansion';

@NgModule({
  declarations: [
    AppComponent,
    FilterItemValueComponent,
    TranslatePipe,
    ReferencePickerComponent,
    SimpleSearchComponent,
    PickerDialogComponent,
    CodeListBrowserComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatChipsModule,
    MatDialogModule,
    MatCheckboxModule,
    ScrollingModule,
    NgxJsonViewerModule
  ],
  providers: [
    provideAnimationsAsync(),
    { provide: MatPaginatorIntl, useClass: TranslatedPaginatorIntl }
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
