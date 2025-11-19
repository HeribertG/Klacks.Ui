import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Country } from 'src/app/domain/models/client-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';


import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { CountriesHeaderComponent } from './countries-header/countries-header.component';
import { CountriesRowComponent } from './countries-row/countries-row.component';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    CountriesHeaderComponent,
    CountriesRowComponent
],
})
export class CountriesComponent {
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onClickAdd() {
    const c = new Country();
    c.name = new MultiLanguage();
    c.isDirty = CreateEntriesEnum.new;

    const currentList = this.dataManagementSettingsService.countriesList;
    this.dataManagementSettingsService.countryStateService.countriesList.set([...currentList, c]);

    setTimeout(() => {
      if (this.containerBox?.nativeElement) {
        this.containerBox.nativeElement.scrollTop = this.containerBox.nativeElement.scrollHeight;
      }
    }, 0);
  }

  onClickDelete(index: number) {
    const currentList = this.dataManagementSettingsService.countriesList;
    const c = currentList[index];

    if (c) {
      if (c.isDirty && c.isDirty === CreateEntriesEnum.new) {
        const updatedList = [...currentList];
        updatedList.splice(index, 1);
        this.dataManagementSettingsService.countryStateService.countriesList.set(updatedList);
      } else {
        if (c.name) {
          c.name.de = c.name.de + '--isDeleted';
        }
        c.isDirty = CreateEntriesEnum.delete;
        this.dataManagementSettingsService.countryStateService.countriesList.set([...currentList]);
      }
    }
  }

  onIsChanging() {
    const currentList = this.dataManagementSettingsService.countriesList;
    this.dataManagementSettingsService.countryStateService.countriesList.set([...currentList]);
  }
}
