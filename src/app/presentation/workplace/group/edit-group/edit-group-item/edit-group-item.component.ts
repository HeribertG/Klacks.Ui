// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  Component,
  DestroyRef,
  Injector,
  LOCALE_ID,
  OnInit,
  effect,
  inject,
  runInInjectionContext,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, disabled, form } from '@angular/forms/signals';
import { NgbDateStruct, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { RichTextEditorComponent } from 'src/app/presentation/shared/rich-text-editor/rich-text-editor.component';
import { ChooseCalendarComponent } from 'src/app/presentation/icons/choose-calendar.component';
import { transformNgbDateStructToDate, transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';

interface EditGroupItemFormModel {
  name: string;
}

@Component({
  selector: 'app-edit-group-item',
  templateUrl: './edit-group-item.component.html',
  styleUrls: ['./edit-group-item.component.scss'],
  standalone: true,
  imports: [
    FormField,
    NgbDropdownModule,
    TranslateModule,
    FontAwesomeModule,
    DateInputComponent,
    RichTextEditorComponent,
    ExpandableCardComponent,
    ChooseCalendarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGroupItemComponent
  implements OnInit, AfterViewInit
{
  public dataManagementGroupService = inject(DataManagementGroupService);
  public authorizationService = inject(AuthorizationService);
  private locale: string = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  readonly isChangingEvent = output<boolean>();

  public currentLang: Language = DomainMessages.DEFAULT_LANG;

  public validFromValid: boolean | undefined = undefined;
  public validUntilValid: boolean | undefined = undefined;
  public validFromTouched = false;
  public validUntilTouched = false;

  public internalValidFrom: NgbDateStruct | undefined;
  public internalValidUntil: NgbDateStruct | undefined;

  calendarSelectionId = signal<string | undefined>(undefined);
  paymentInterval = signal<PaymentInterval>(PaymentInterval.Monthly);

  public groupFormModel = signal<EditGroupItemFormModel>({ name: '' });
  public groupForm = form(this.groupFormModel, (f) => {
    disabled(f, { when: () => !this.authorizationService.isAuthorised });
  });

  private isFormLoaded = false;
  private initSkipCount = 0;

  paymentIntervalOptions = [
    PaymentInterval.Weekly,
    PaymentInterval.Biweekly,
    PaymentInterval.Monthly,
    PaymentInterval.Individual,
  ];

  private paymentIntervalLabelKeys: Record<PaymentInterval, string> = {
    [PaymentInterval.Weekly]: 'settings.work.payment-weekly',
    [PaymentInterval.Biweekly]: 'settings.work.payment-biweekly',
    [PaymentInterval.Monthly]: 'settings.work.payment-monthly',
    [PaymentInterval.Individual]: 'settings.work.payment-individual',
  };

  ngOnInit(): void {
    this.readSignals();

    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementGroupService.init();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const isReset = this.dataManagementGroupService.isReset();
        if (isReset) {
          this.isFormLoaded = false;
          setTimeout(() => this.isChangingEvent.emit(false), 100);
        }
      });

      effect(() => {
        const group = this.dataManagementGroupService.editGroup;
        if (group) {
          this.internalValidFrom = group.validFrom ? transformDateToNgbDateStruct(group.validFrom) : undefined;
          this.internalValidUntil = group.validUntil ? transformDateToNgbDateStruct(group.validUntil) : undefined;
          this.paymentInterval.set(group.paymentInterval ?? PaymentInterval.Monthly);
          this.calendarSelectionId.set(group.calendarSelectionId);
          this.calcValidation();
          this.initSkipCount++;
          this.groupFormModel.set({ name: group.name ?? '' });
          this.isFormLoaded = true;
        }
      });

      effect(() => {
        const data = this.groupFormModel();
        if (!this.isFormLoaded) return;
        if (this.initSkipCount > 0) { this.initSkipCount--; return; }
        if (this.dataManagementGroupService.editGroup) {
          this.dataManagementGroupService.editGroup.name = data.name;
        }
        setTimeout(() => {
          this.isChangingEvent.emit(true);
          this.cdr.markForCheck();
        }, 100);
      });
    });
  }

  public calcValidation(): void {
    const group = this.dataManagementGroupService.editGroup;
    if (!group) {
      return;
    }

    this.validFromValid = group.validFrom ? true : undefined;

    if (group.validUntil) {
      const validFrom = group.validFrom ? new Date(group.validFrom) : null;
      const validUntil = new Date(group.validUntil);

      if (!validFrom || !validUntil) {
        this.validUntilValid = false;
      } else {
        this.validUntilValid = validFrom < validUntil;
      }
    } else {
      this.validUntilValid = undefined;
    }
  }

  public onValidFromChange(): void {
    this.validFromTouched = true;
    const group = this.dataManagementGroupService.editGroup;
    if (group && this.internalValidFrom) {
      const date = transformNgbDateStructToDate(this.internalValidFrom);
      if (date) {
        group.validFrom = date;
      }
    }
    this.calcValidation();
  }

  public onValidUntilChange(): void {
    this.validUntilTouched = true;
    const group = this.dataManagementGroupService.editGroup;
    if (group) {
      group.validUntil = this.internalValidUntil ? transformNgbDateStructToDate(this.internalValidUntil) : undefined;
    }
    this.calcValidation();
  }

  public onDescriptionChange(content: string): void {
    if (this.dataManagementGroupService.editGroup) {
      this.dataManagementGroupService.editGroup.description = content;
      this.isChangingEvent.emit(true);
    }
  }

  public onPaymentIntervalChange(value: PaymentInterval): void {
    this.paymentInterval.set(value);
    if (this.dataManagementGroupService.editGroup) {
      this.dataManagementGroupService.editGroup.paymentInterval = value;
      this.isChangingEvent.emit(true);
    }
  }

  public getPaymentIntervalLabel(value?: PaymentInterval): string {
    const interval = value ?? this.paymentInterval();
    return this.translateService.instant(this.paymentIntervalLabelKeys[interval]);
  }

  public onCalendarSelectionChange(calendarId: string): void {
    this.calendarSelectionId.set(calendarId || undefined);
    if (this.dataManagementGroupService.editGroup) {
      if (calendarId) {
        const selectedCalendar =
          this.dataManagementGroupService.availableCalendars.find(
            (cal) => cal.id === calendarId
          );
        this.dataManagementGroupService.editGroup.calendarSelection = selectedCalendar;
        this.dataManagementGroupService.editGroup.calendarSelectionId = calendarId;
      } else {
        this.dataManagementGroupService.editGroup.calendarSelection = undefined;
        this.dataManagementGroupService.editGroup.calendarSelectionId = undefined;
      }
      this.isChangingEvent.emit(true);
    }
  }

  public getSelectedCalendarName(): string {
    const selectedId = this.calendarSelectionId();
    if (!selectedId) {
      return this.translateService.instant('setting.contract.noCalendar');
    }
    const calendar = this.dataManagementGroupService.availableCalendars.find(
      (cal) => cal.id === selectedId
    );
    return calendar?.name || this.translateService.instant('setting.contract.noCalendar');
  }
}
