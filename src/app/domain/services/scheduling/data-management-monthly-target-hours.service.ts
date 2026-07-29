// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * CRUD for the company-wide monthly target hours table. Rows are sparse, so a single month is
 * created, updated or deleted depending on whether it carries a value. Changes are saved
 * immediately, the settings card has no save button.
 * @param year - Calendar year of the edited month
 * @param month - Month number from 1 to 12
 * @param hours - Target hours, undefined meaning the month has no override and its row is removed
 */
import { inject, Injectable, signal } from '@angular/core';
import { IMonthlyTargetHours } from 'src/app/domain/models/scheduling/monthly-target-hours.model';
import { MonthlyTargetHoursApiService } from 'src/app/infrastructure/api/scheduling/monthly-target-hours-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TranslateService } from '@ngx-translate/core';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';
import { MONTHLY_TARGET_HOURS } from 'src/app/domain/constants/monthly-target-hours.constants';

@Injectable({
  providedIn: 'root',
})
export class DataManagementMonthlyTargetHoursService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(MonthlyTargetHoursApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal(false);
  public monthlyTargetHours: IMonthlyTargetHours[] = [];

  async init(): Promise<void> {
    await this.readMonthlyTargetHours();
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    resetSignalAfterDelay(this.isRead);
  }

  async readMonthlyTargetHours(): Promise<IMonthlyTargetHours[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await this.apiService.getAll();
      this.monthlyTargetHours = Array.isArray(result) ? [...result] : [];
      this.fireIsReadEvent();
      return this.monthlyTargetHours;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementMonthlyTargetHoursService.readMonthlyTargetHours'
      });
      console.error('Error loading monthly target hours:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  rowsOfYear(year: number): IMonthlyTargetHours[] {
    return this.monthlyTargetHours.filter(row => row.year === year);
  }

  hoursOf(year: number, month: number): number | undefined {
    return this.monthlyTargetHours.find(row => row.year === year && row.month === month)?.hours;
  }

  availableYears(): number[] {
    return [...new Set(this.monthlyTargetHours.map(row => row.year))].sort((a, b) => a - b);
  }

  async saveMonth(year: number, month: number, hours: number | undefined): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      const row = this.monthlyTargetHours.find(r => r.year === year && r.month === month);

      if (hours === undefined || hours === null) {
        if (row?.id) {
          await this.apiService.delete(row.id);
          await this.readMonthlyTargetHours();
        }
        return true;
      }

      if (row?.id) {
        if (row.hours === hours) {
          return true;
        }
        await this.apiService.update({ ...row, hours });
      } else {
        await this.apiService.create({ year, month, hours });
      }

      await this.readMonthlyTargetHours();
      return true;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorSavingData',
        context: 'DataManagementMonthlyTargetHoursService.saveMonth'
      });
      console.error('Error saving monthly target hours:', error);
      await this.readMonthlyTargetHours();
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  validateMonth(year: number, hours: number | undefined): string[] {
    const errors: string[] = [];

    if (!Number.isInteger(year) || year < MONTHLY_TARGET_HOURS.minYear || year > MONTHLY_TARGET_HOURS.maxYear) {
      errors.push(this.translate.instant('setting.monthlyTargetHours.validation.invalidYear'));
    }

    if (hours !== undefined && hours !== null && hours < 0) {
      errors.push(this.translate.instant('setting.monthlyTargetHours.validation.hoursPositive'));
    }

    return errors;
  }
}
