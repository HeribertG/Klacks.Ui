// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ElementRef, ViewChild, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { Country } from 'src/app/domain/models/client/client-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Subject, takeUntil } from 'rxjs';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { CountriesHeaderComponent } from './countries-header/countries-header.component';
import { CountriesRowComponent } from './countries-row/countries-row.component';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Component({
  selector: 'app-countries',
  templateUrl: './countries.component.html',
  styleUrls: ['./countries.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    NgbModule,
    SpinnerModule,
    CountriesHeaderComponent,
    CountriesRowComponent
],
})
export class CountriesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  message = DomainMessages.DELETE_ENTRY;

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'countries'
        ) {
          this.deleteCountry(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  openDeleteCountry(index: number): void {
    const currentList = this.dataManagementSettingsService.countriesList;
    if (index >= 0 && index < currentList.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'countries';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private deleteCountry(indexStr: string): void {
    const index = parseInt(indexStr, 10);
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
