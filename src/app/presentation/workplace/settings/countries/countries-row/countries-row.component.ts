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
  nameCurrent: string;
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

  readonly currentLang = signal<Language>(DomainMessages.DEFAULT_LANG);
  private translateService = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  private isInitialized = false;
  private lastModel: CountryModel | null = null;
  private countryModel = signal<CountryModel>({
    abbreviation: '',
    nameCurrent: '',
    prefix: '',
  });
  countryForm = form(this.countryModel, f => {
    debounce(f.abbreviation, 500);
    debounce(f.nameCurrent, 500);
    debounce(f.prefix, 500);
  });

  constructor() {
    effect(() => {
      const currentData = this.data();
      const langKey = this.currentLang().toLowerCase();
      if (currentData) {
        const initialModel: CountryModel = {
          abbreviation: currentData.abbreviation || '',
          nameCurrent: currentData.name?.[langKey] || '',
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
      const langKey = untracked(() => this.currentLang()).toLowerCase();
      if (this.isInitialized && currentData && this.hasModelChanged(model)) {
        currentData.abbreviation = model.abbreviation;
        currentData.name![langKey] = model.nameCurrent;
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
      model.nameCurrent !== this.lastModel.nameCurrent ||
      model.prefix !== this.lastModel.prefix
    );
  }

  ngOnInit(): void {
    this.currentLang.set(this.translateService.currentLang as Language);

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang.set(this.translateService.currentLang as Language);
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
