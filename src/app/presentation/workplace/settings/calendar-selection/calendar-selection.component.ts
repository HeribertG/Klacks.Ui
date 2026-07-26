// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Settings list for calendar selections with a modal for add/edit.
 * Seeded (system) selections cannot be deleted; selections used by
 * contracts or groups are also protected against deletion.
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  TemplateRef,
  viewChild,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { CalendarSelectionHeaderComponent } from './calendar-selection-header/calendar-selection-header.component';
import { CalendarSelectionRowComponent } from './calendar-selection-row/calendar-selection-row.component';
import {
  CalendarSelection,
  ICalendarSelection,
  ISelectedCalendar,
  SelectedCalendar,
} from 'src/app/domain/models/calendar/calendar-selection-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';

interface CalendarSelectionFormModel {
  name: string;
}

const COMPONENT_CONTEXT = 'calendar-selection';
const NAME_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-calendar-selection',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SettingsListCardComponent,
    CalendarSelectionHeaderComponent,
    CalendarSelectionRowComponent,
  ],
  templateUrl: './calendar-selection.component.html',
  styleUrls: ['./calendar-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSelectionComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  readonly calendarSelectionModal =
    viewChild.required<TemplateRef<any>>('calendarSelectionModal');

  public dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );
  private dataManagementCalendarRulesService = inject(
    DataManagementCalendarRulesService
  );
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private modalOpenTimer: ReturnType<typeof setTimeout> | undefined;

  calendarSelections = signal<ICalendarSelection[]>([]);
  searchTerm = signal('');
  filteredSelections = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.calendarSelections();
    }
    return this.calendarSelections().filter((x) =>
      x.name.toLowerCase().includes(term)
    );
  });

  ruleTokens = signal<StateCountryToken[]>([]);
  selectedCountry = signal('');
  selectedTokens = signal<ISelectedCalendar[]>([]);

  countries = computed(() => {
    const nationalTokens = this.ruleTokens().filter(
      (x) => x.state === x.country
    );
    return nationalTokens.sort((a, b) =>
      this.getTokenLabel(a).localeCompare(this.getTokenLabel(b))
    );
  });

  statesForCountry = computed(() => {
    const country = this.selectedCountry();
    if (!country) {
      return [];
    }
    return this.ruleTokens()
      .filter((x) => x.country === country)
      .sort((a, b) => {
        if (a.state === a.country) {
          return -1;
        }
        if (b.state === b.country) {
          return 1;
        }
        return this.getTokenLabel(a).localeCompare(this.getTokenLabel(b));
      });
  });

  editingSelection: ICalendarSelection | null = null;
  isNewSelection = false;
  private isSaving = false;
  message = DomainMessages.DELETE_ENTRY;

  private formModel = signal<CalendarSelectionFormModel>({ name: '' });

  calendarSelectionForm = form(this.formModel, (f) => {
    debounce(f.name, NAME_DEBOUNCE_MS);
  });

  ngOnInit(): void {
    this.loadCalendarSelections();
    this.loadRuleTokens();
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, COMPONENT_CONTEXT)
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.deleteCalendarSelection(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    if (this.modalOpenTimer !== undefined) {
      clearTimeout(this.modalOpenTimer);
      this.modalOpenTimer = undefined;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  isUsedByContracts(item: ICalendarSelection): boolean {
    return (
      !!item.id &&
      this.dataManagementCalendarSelectionService
        .usedByContracts()
        .includes(item.id)
    );
  }

  canDelete(item: ICalendarSelection): boolean {
    return !item.isSeeded && !this.isUsedByContracts(item);
  }

  deleteDisabledReasonKey(item: ICalendarSelection): string {
    if (item.isSeeded) {
      return 'setting.calendar-selection.cannot-delete-seeded';
    }
    if (this.isUsedByContracts(item)) {
      return 'setting.calendar-selection.cannot-delete-used';
    }
    return '';
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onClickAdd(): void {
    this.isNewSelection = true;
    this.editingSelection = new CalendarSelection();
    this.editingSelection.id = undefined;
    this.formModel.set({ name: '' });
    this.selectedTokens.set([]);
    this.setDefaultCountry();
    this.openModal();
  }

  onClickEdit(item: ICalendarSelection): void {
    this.isNewSelection = false;
    this.editingSelection = { ...item };
    this.formModel.set({ name: item.name });
    this.selectedTokens.set(
      item.selectedCalendars.map((x) => {
        const token = new SelectedCalendar();
        token.id = x.id;
        token.country = x.country;
        token.state = x.state;
        token.officialOverride = x.officialOverride;
        return token;
      })
    );
    const firstCountry = item.selectedCalendars[0]?.country;
    if (firstCountry) {
      this.selectedCountry.set(firstCountry);
    } else {
      this.setDefaultCountry();
    }
    this.openModal();
  }

  onCountryChange(country: string): void {
    this.selectedCountry.set(country);
  }

  isTokenSelected(token: StateCountryToken): boolean {
    return this.selectedTokens().some(
      (x) => x.country === token.country && x.state === token.state
    );
  }

  toggleToken(token: StateCountryToken): void {
    const current = this.selectedTokens();
    const index = current.findIndex(
      (x) => x.country === token.country && x.state === token.state
    );
    if (index >= 0) {
      this.selectedTokens.set(current.filter((_, i) => i !== index));
    } else {
      const item = new SelectedCalendar();
      item.country = token.country;
      item.state = token.state;
      item.officialOverride = null;
      this.selectedTokens.set([...current, item]);
    }
  }

  isTokenReminderOnly(token: ISelectedCalendar): boolean {
    return token.officialOverride === false;
  }

  setTokenReminderOnly(token: ISelectedCalendar, value: boolean): void {
    this.selectedTokens.set(
      this.selectedTokens().map((x) => {
        if (x.country === token.country && x.state === token.state) {
          const updated = new SelectedCalendar();
          updated.id = x.id;
          updated.calendarSelection = x.calendarSelection;
          updated.country = x.country;
          updated.state = x.state;
          updated.officialOverride = value ? false : null;
          return updated;
        }
        return x;
      })
    );
  }

  removeToken(token: ISelectedCalendar): void {
    this.selectedTokens.set(
      this.selectedTokens().filter(
        (x) => !(x.country === token.country && x.state === token.state)
      )
    );
  }

  getTokenLabel(token: StateCountryToken): string {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    if (token.state === token.country) {
      return `${
        token.countryName[lang] || token.countryName.en || token.country
      } (${this.translate.instant('setting.calendar-selection.modal.national')})`;
    }
    return token.stateName[lang] || token.stateName.en || token.state;
  }

  getCountryLabel(token: StateCountryToken): string {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    return token.countryName[lang] || token.countryName.en || token.country;
  }

  getSelectedTokenLabel(token: ISelectedCalendar): string {
    return token.state === token.country
      ? token.country
      : `${token.country}-${token.state}`;
  }

  openDeleteCalendarSelection(item: ICalendarSelection): void {
    if (item.id && this.canDelete(item)) {
      this.modalService.Filing = item.id;
      this.modalService.componentContext = COMPONENT_CONTEXT;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveCalendarSelection();
    if (success) {
      modal.close();
    }
  }

  isFormValid(): boolean {
    return (
      !!this.formModel().name?.trim() && this.selectedTokens().length > 0
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingSelection) {
      return errors;
    }
    if (!this.formModel().name?.trim()) {
      errors.push(
        this.translate.instant(
          'setting.calendar-selection.validation.name-required'
        )
      );
    }
    if (this.selectedTokens().length === 0) {
      errors.push(
        this.translate.instant(
          'setting.calendar-selection.validation.calendars-required'
        )
      );
    }
    return errors;
  }

  private openModal(): void {
    if (this.modalOpenTimer !== undefined) {
      clearTimeout(this.modalOpenTimer);
    }
    this.modalOpenTimer = setTimeout(() => {
      this.modalOpenTimer = undefined;
      this.ngbModal.open(this.calendarSelectionModal(), {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  private setDefaultCountry(): void {
    const first = this.countries()[0];
    this.selectedCountry.set(first ? first.country : '');
  }

  private async loadCalendarSelections(): Promise<void> {
    try {
      await this.dataManagementCalendarSelectionService.readData();
      this.calendarSelections.set(
        this.dataManagementCalendarSelectionService.getPersistedSelections()
      );
    } catch (error) {
      console.error('Error loading calendar selections:', error);
      this.toastService.showError('setting.calendar-selection.error.load');
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async loadRuleTokens(): Promise<void> {
    try {
      const tokens =
        await this.dataManagementCalendarRulesService.loadRuleTokens();
      this.ruleTokens.set(tokens);
      if (!this.selectedCountry()) {
        this.setDefaultCountry();
      }
    } catch (error) {
      console.error('Error loading rule tokens:', error);
      this.toastService.showError('setting.calendar-selection.error.load');
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async saveCalendarSelection(): Promise<boolean> {
    if (!this.editingSelection || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.isSaving = true;
    this.editingSelection.name = this.formModel().name.trim();
    this.editingSelection.selectedCalendars = this.selectedTokens();

    try {
      if (this.isNewSelection) {
        await this.dataManagementCalendarSelectionService.createCalendarSelection(
          this.editingSelection
        );
      } else {
        await this.dataManagementCalendarSelectionService.updateCalendarSelectionItem(
          this.editingSelection
        );
      }
      this.calendarSelections.set(
        this.dataManagementCalendarSelectionService.getPersistedSelections()
      );
      return true;
    } catch (error) {
      console.error('Error saving calendar selection:', error);
      this.toastService.showError('setting.calendar-selection.error.save');
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async deleteCalendarSelection(id: string): Promise<void> {
    try {
      await this.dataManagementCalendarSelectionService.removeCalendarSelection(
        id
      );
      this.calendarSelections.set(
        this.dataManagementCalendarSelectionService.getPersistedSelections()
      );
    } catch (error) {
      console.error('Error deleting calendar selection:', error);
      this.toastService.showError('setting.calendar-selection.error.delete');
    } finally {
      this.cdr.markForCheck();
    }
  }
}
