// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  inject,
  effect,
  signal,
  input,
  output,
  untracked,
  ChangeDetectorRef,
} from '@angular/core';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ICountry } from 'src/app/domain/models/client/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

interface CountryModel {
  abbreviation: string;
  nameDe: string;
  nameEn: string;
  nameFr: string;
  nameIt: string;
  prefix: string;
}

@Component({
  selector: 'app-countries-row',
  templateUrl: './countries-row.component.html',
  styleUrls: ['./countries-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountriesRowComponent implements OnInit, OnDestroy {
  readonly data = input<ICountry | undefined>(undefined);
  readonly isDeleteEvent = output<void>();
  readonly isChangingEvent = output<void>();

  currentLang: Language = DomainMessages.DEFAULT_LANG;
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private ngUnsubscribe = new Subject<void>();

  private isInitialized = false;
  private lastModel: CountryModel | null = null;
  private countryModel = signal<CountryModel>({
    abbreviation: '',
    nameDe: '',
    nameEn: '',
    nameFr: '',
    nameIt: '',
    prefix: '',
  });
  countryForm = form(this.countryModel, f => {
    debounce(f.abbreviation, 500);
    debounce(f.nameDe, 500);
    debounce(f.nameEn, 500);
    debounce(f.nameFr, 500);
    debounce(f.nameIt, 500);
    debounce(f.prefix, 500);
  });

  constructor() {
    effect(() => {
      const currentData = this.data();
      if (currentData) {
        const initialModel: CountryModel = {
          abbreviation: currentData.abbreviation || '',
          nameDe: currentData.name?.de || '',
          nameEn: currentData.name?.en || '',
          nameFr: currentData.name?.fr || '',
          nameIt: currentData.name?.it || '',
          prefix: currentData.prefix || '',
        };
        this.countryModel.set(initialModel);
        this.lastModel = { ...initialModel };
        this.isInitialized = true;
      }
    });

    effect(() => {
      const model = this.countryModel();
      const currentData = untracked(() => this.data());
      if (this.isInitialized && currentData && this.hasModelChanged(model)) {
        currentData.abbreviation = model.abbreviation;
        currentData.name!.de = model.nameDe;
        currentData.name!.en = model.nameEn;
        currentData.name!.fr = model.nameFr;
        currentData.name!.it = model.nameIt;
        currentData.prefix = model.prefix;
        this.lastModel = { ...model };
        this.updateDataDirtyState();
      }
    });
  }

  private hasModelChanged(model: CountryModel): boolean {
    if (!this.lastModel) return false;
    return (
      model.abbreviation !== this.lastModel.abbreviation ||
      model.nameDe !== this.lastModel.nameDe ||
      model.nameEn !== this.lastModel.nameEn ||
      model.nameFr !== this.lastModel.nameFr ||
      model.nameIt !== this.lastModel.nameIt ||
      model.prefix !== this.lastModel.prefix
    );
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  private updateDataDirtyState(): void {
    const currentData = this.data();
    if (currentData) {
      if (
        currentData.isDirty === undefined ||
        currentData.isDirty === CreateEntriesEnum.undefined
      ) {
        currentData.isDirty = CreateEntriesEnum.rewrite;
      }
      this.isChangingEvent.emit();
    }
  }
}
