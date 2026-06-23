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
  ChangeDetectorRef,
} from '@angular/core';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IState } from 'src/app/domain/models/client/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

interface StateModel {
  abbreviation: string;
  nameDe: string;
  nameEn: string;
  nameFr: string;
  nameIt: string;
  countryPrefix: string;
}

@Component({
  selector: 'app-state-row',
  templateUrl: './state-row.component.html',
  styleUrls: ['./state-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateRowComponent implements OnInit, OnDestroy {
  readonly data = input<IState | undefined>(undefined);
  readonly isDeleteEvent = output<void>();
  readonly isChangingEvent = output<void>();

  currentLang: Language = DomainMessages.DEFAULT_LANG;

  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private ngUnsubscribe = new Subject<void>();

  private isInitialized = false;
  private lastModel: StateModel | null = null;
  private stateModel = signal<StateModel>({
    abbreviation: '',
    nameDe: '',
    nameEn: '',
    nameFr: '',
    nameIt: '',
    countryPrefix: '',
  });
  stateForm = form(this.stateModel, f => {
    debounce(f.abbreviation, 500);
    debounce(f.nameDe, 500);
    debounce(f.nameEn, 500);
    debounce(f.nameFr, 500);
    debounce(f.nameIt, 500);
    debounce(f.countryPrefix, 500);
  });

  constructor() {
    effect(() => {
      const currentData = this.data();
      if (currentData) {
        const initialModel: StateModel = {
          abbreviation: currentData.abbreviation || '',
          nameDe: currentData.name?.de || '',
          nameEn: currentData.name?.en || '',
          nameFr: currentData.name?.fr || '',
          nameIt: currentData.name?.it || '',
          countryPrefix: currentData.countryPrefix || '',
        };
        this.stateModel.set(initialModel);
        this.lastModel = { ...initialModel };
        this.isInitialized = true;
      }
    });

    effect(() => {
      const model = this.stateModel();
      const currentData = this.data();
      if (this.isInitialized && currentData && this.hasModelChanged(model)) {
        currentData.abbreviation = model.abbreviation;
        currentData.name!.de = model.nameDe;
        currentData.name!.en = model.nameEn;
        currentData.name!.fr = model.nameFr;
        currentData.name!.it = model.nameIt;
        currentData.countryPrefix = model.countryPrefix;
        this.lastModel = { ...model };
        this.updateDataDirtyState();
      }
    });
  }

  private hasModelChanged(model: StateModel): boolean {
    if (!this.lastModel) return false;
    return (
      model.abbreviation !== this.lastModel.abbreviation ||
      model.nameDe !== this.lastModel.nameDe ||
      model.nameEn !== this.lastModel.nameEn ||
      model.nameFr !== this.lastModel.nameFr ||
      model.nameIt !== this.lastModel.nameIt ||
      model.countryPrefix !== this.lastModel.countryPrefix
    );
  }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;

    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
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
