import { Component, EventEmitter, inject, Output } from '@angular/core';
import { Country } from 'src/app/core/client-class';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';

import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { CountriesHeaderComponent } from './countries-header/countries-header.component';
import { CountriesRowComponent } from './countries-row/countries-row.component';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SharedModule,
    CountriesHeaderComponent,
    CountriesRowComponent,
  ],
})
export class CountriesComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onClickAdd() {
    const c = new Country();
    c.name = new MultiLanguage();

    c.isDirty = CreateEntriesEnum.new;
    this.dataManagementSettingsService.countriesList.push(c);
    this.onIsChanging(true);
  }

  onClickDelete(index: number) {
    const c = this.dataManagementSettingsService.countriesList[index];

    if (c) {
      if (c.isDirty && c.isDirty === CreateEntriesEnum.new) {
        this.dataManagementSettingsService.countriesList.splice(index, 1);
      } else {
        c.name!.de = c.name!.de + '--isDeleted';
        c.isDirty = CreateEntriesEnum.delete;
      }
    }

    this.onIsChanging(true);
  }

  onIsChanging(value: any) {
    this.isChangingEvent.emit(value);
  }
}
