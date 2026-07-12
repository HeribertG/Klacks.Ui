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
import { IState } from 'src/app/domain/models/client/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

interface StateModel {
  abbreviation: string;
  nameCurrent: string;
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

  readonly currentLang = signal<Language>(DomainMessages.DEFAULT_LANG);

  public translate = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  private isInitialized = false;
  private lastModel: StateModel | null = null;
  private stateModel = signal<StateModel>({
    abbreviation: '',
    nameCurrent: '',
    countryPrefix: '',
  });
  stateForm = form(this.stateModel, f => {
    debounce(f.abbreviation, 500);
    debounce(f.nameCurrent, 500);
    debounce(f.countryPrefix, 500);
  });

  constructor() {
    effect(() => {
      const currentData = this.data();
      const langKey = this.currentLang().toLowerCase();
      if (currentData) {
        const initialModel: StateModel = {
          abbreviation: currentData.abbreviation || '',
          nameCurrent: currentData.name?.[langKey] || '',
          countryPrefix: currentData.countryPrefix || '',
        };
        this.stateModel.set(initialModel);
        this.lastModel = { ...initialModel };
        this.isInitialized = true;
      }
    });

    effect(() => {
      const model = this.stateModel();
      const currentData = untracked(() => this.data());
      const langKey = untracked(() => this.currentLang()).toLowerCase();
      if (this.isInitialized && currentData && this.hasModelChanged(model)) {
        currentData.abbreviation = model.abbreviation;
        currentData.name![langKey] = model.nameCurrent;
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
      model.nameCurrent !== this.lastModel.nameCurrent ||
      model.countryPrefix !== this.lastModel.countryPrefix
    );
  }

  ngOnInit(): void {
    this.currentLang.set(this.translate.currentLang as Language);

    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang.set(this.translate.currentLang as Language);
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
