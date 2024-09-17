import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Country } from 'src/app/core/client-class';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss'],
})
export class CountriesComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  constructor(
    public dataManagementSettingsService: DataManagementSettingsService
  ) {}

  ngOnInit(): void {}

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
