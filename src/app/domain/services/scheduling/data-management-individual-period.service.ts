// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * CRUD and validation for IndividualPeriod aggregates (custom pay-period definitions used by
 * contracts with PaymentInterval.Individual). Keeps an in-memory list and exposes the
 * selectable list used by the contract FK-dropdown.
 */
import { inject, Injectable, signal } from '@angular/core';
import { IIndividualPeriod, IndividualPeriod } from 'src/app/domain/models/scheduling/individual-period.model';
import { IndividualPeriodApiService } from 'src/app/infrastructure/api/scheduling/individual-period-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TranslateService } from '@ngx-translate/core';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementIndividualPeriodService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(IndividualPeriodApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal(false);
  public individualPeriods: IIndividualPeriod[] = [];

  async init(): Promise<void> {
    await this.readIndividualPeriods();
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    resetSignalAfterDelay(this.isRead);
  }

  private normalizeDates(period: IIndividualPeriod): IIndividualPeriod {
    return {
      ...period,
      periods: period.periods.map(row => ({
        ...row,
        fromDate: new Date(row.fromDate),
        untilDate: row.untilDate ? new Date(row.untilDate) : undefined,
      })),
    };
  }

  async readIndividualPeriods(): Promise<IIndividualPeriod[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await this.apiService.getAll();
      this.individualPeriods = [];

      if (result && Array.isArray(result)) {
        this.individualPeriods.push(...result.map(p => this.normalizeDates(p)));
      }

      this.fireIsReadEvent();
      return this.individualPeriods;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementIndividualPeriodService.readIndividualPeriods'
      });
      console.error('Error loading individual periods:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  public async readSelectableIndividualPeriods(): Promise<IIndividualPeriod[]> {
    try {
      const result = await this.apiService.getAll();
      return Array.isArray(result) ? result.map(p => this.normalizeDates(p)) : [];
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementIndividualPeriodService.readSelectableIndividualPeriods'
      });
      console.error('Error loading selectable individual periods:', error);
      return [];
    }
  }

  createIndividualPeriod(): IndividualPeriod {
    return new IndividualPeriod();
  }

  async saveExistingIndividualPeriod(period: IIndividualPeriod): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      const action = period.id
        ? this.apiService.update(period)
        : this.apiService.create(period);

      const result = await action;

      if (result) {
        await this.readIndividualPeriods();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving individual period:', error);
      await this.readIndividualPeriods();
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async deleteIndividualPeriod(id: string): Promise<boolean> {
    if (!id) {
      return false;
    }

    this._showProgressSpinner.set(true);

    try {
      await this.apiService.delete(id);
      await this.readIndividualPeriods();
      return true;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorDeletingData',
        context: 'DataManagementIndividualPeriodService.deleteIndividualPeriod'
      });
      console.error('Error deleting individual period:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  validateIndividualPeriod(period: IIndividualPeriod): string[] {
    const errors: string[] = [];

    if (!period.name || period.name.trim() === '') {
      errors.push(
        this.translate.instant('setting.individualPeriod.validation.nameRequired')
      );
    }

    if (!period.periods || period.periods.length === 0) {
      errors.push(
        this.translate.instant('setting.individualPeriod.validation.rowRequired')
      );
    }

    for (const row of period.periods ?? []) {
      if (!row.fromDate) {
        errors.push(
          this.translate.instant('setting.individualPeriod.validation.fromDateRequired')
        );
      }

      if (row.untilDate && row.fromDate && new Date(row.untilDate) < new Date(row.fromDate)) {
        errors.push(
          this.translate.instant('setting.individualPeriod.validation.invalidDateRange')
        );
      }

      if (!(row.fullHours >= 0)) {
        errors.push(
          this.translate.instant('setting.individualPeriod.validation.fullHoursPositive')
        );
      }
    }

    return errors;
  }
}
