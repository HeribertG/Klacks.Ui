// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  inject,
  effect,
  signal,
} from '@angular/core';
import { form, Field, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IState } from 'src/app/domain/models/client/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';

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
  imports: [TranslateModule, Field],
})
export class StateRowComponent implements OnInit, OnChanges, OnDestroy {
  @Input() data: IState | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() isChangingEvent = new EventEmitter<void>();

  currentLang: Language = DomainMessages.DEFAULT_LANG;

  public translate = inject(TranslateService);
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
      const model = this.stateModel();
      if (this.isInitialized && this.data && this.hasModelChanged(model)) {
        this.data.abbreviation = model.abbreviation;
        this.data.name!.de = model.nameDe;
        this.data.name!.en = model.nameEn;
        this.data.name!.fr = model.nameFr;
        this.data.name!.it = model.nameIt;
        this.data.countryPrefix = model.countryPrefix;
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
      });
  }

  ngOnChanges(): void {
    if (this.data) {
      const initialModel: StateModel = {
        abbreviation: this.data.abbreviation || '',
        nameDe: this.data.name?.de || '',
        nameEn: this.data.name?.en || '',
        nameFr: this.data.name?.fr || '',
        nameIt: this.data.name?.it || '',
        countryPrefix: this.data.countryPrefix || '',
      };
      this.stateModel.set(initialModel);
      this.lastModel = { ...initialModel };
      this.isInitialized = true;
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  private updateDataDirtyState(): void {
    if (this.data) {
      if (
        this.data.isDirty === undefined ||
        this.data.isDirty === CreateEntriesEnum.undefined
      ) {
        this.data.isDirty = CreateEntriesEnum.rewrite;
      }
      this.isChangingEvent.emit();
    }
  }
}
