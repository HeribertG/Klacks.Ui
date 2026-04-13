// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Lifecycle service for the container shift override edit modal dialog.
 * @param containerId - The container shift this override belongs to
 * @param date - The specific ISO date for the override
 * @param weekday - Derived weekday string from the date
 */

import { Injectable, inject, signal } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { IContainerShiftOverride, IContainerShiftOverrideItem } from 'src/app/domain/models/container/container-shift-override';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateRouteService } from 'src/app/presentation/workplace/shift/container-template/services/container-template-route.service';
import { ContainerTransportModeEnum, TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { DataContainerShiftOverrideService } from 'src/app/infrastructure/api/container/data-container-shift-override.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { sortContainerItemsChronologically } from 'src/app/shared/helpers/container-template-sort.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { WEEKDAY_NAMES } from 'src/app/shared/helpers/date.helper';
import { newGuid } from 'src/app/shared/helpers/guid.helper';
const DEFAULT_TIME_FROM_HOURS = '06';
const DEFAULT_TIME_FROM_MINUTES = '00';
const DEFAULT_TIME_TO_HOURS = '18';
const DEFAULT_TIME_TO_MINUTES = '00';
const EMPTY_TIME = '00:00';
const HTTP_STATUS_NOT_FOUND = 404;

@Injectable()
export class ContainerShiftOverrideLifecycleService {
  private shiftService = inject(ContainerTemplateShiftService);
  private routeService = inject(ContainerTemplateRouteService);
  private overrideApiService = inject(DataContainerShiftOverrideService);
  private templateApiService = inject(DataContainerTemplateService);
  private dataAbsenceService = inject(DataAbsenceService);
  private destroyRef = inject(DestroyRef);

  readonly isDirty = signal(false);
  readonly isLoading = signal(false);
  readonly isReadOnly = signal(false);
  readonly readOnlyReason = signal('');
  readonly availableShiftsVersion = signal(0);
  readonly lastError = signal<string | null>(null);
  readonly isEmploymentTabActive = signal(false);
  readonly containerAbsences = signal<IAbsence[]>([]);

  containerId = '';
  date = '';
  weekday = 'monday';
  weekdayNumber = 1;
  isHoliday = false;
  currentOverride: IContainerShiftOverride | null = null;
  containerShiftAbbreviation = '';
  containerStartTime: string | null = null;
  containerEndTime: string | null = null;

  private availableShiftsAsIShift: IShift[] = [];

  get availableTasks(): IShift[] {
    const selectedShiftIds = this.shiftService
      .selectedContainerTemplateItemsSignal()
      .map(item => item.shiftId)
      .filter((id): id is string => id != null);
    return this.availableShiftsAsIShift.filter(
      shift => !selectedShiftIds.includes(shift.id!),
    );
  }

  initialize(
    containerId: string,
    date: string,
    weekday: string,
    isHoliday: boolean,
    containerStartTime?: string,
    containerEndTime?: string,
  ): Observable<void> {
    this.containerId = containerId;
    this.date = date;
    this.weekday = weekday;
    this.weekdayNumber = (WEEKDAY_NAMES as readonly string[]).indexOf(weekday);
    this.isHoliday = isHoliday;
    this.containerStartTime = containerStartTime ?? null;
    this.containerEndTime = containerEndTime ?? null;
    this.currentOverride = null;
    this.isDirty.set(false);
    this.isLoading.set(true);
    this.isReadOnly.set(false);
    this.readOnlyReason.set('');
    this.lastError.set(null);
    this.shiftService.setCurrentWeekday(weekday);
    this.shiftService.setSelectedContainerTemplateItems([]);
    this.shiftService.setSelectedShift(null);

    return this.overrideApiService.getOverride(containerId, date).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(override => {
        this.currentOverride = override;
        this.containerShiftAbbreviation = override.shift?.abbreviation ?? '';
        this.containerStartTime = override.fromTime ?? containerStartTime ?? null;
        this.containerEndTime = override.untilTime ?? containerEndTime ?? null;
        this.applyRouteValues(override.startBase, override.endBase, override.transportMode);
        this.initializeItemsFromOverride(override);
        if (override.hasWork) {
          this.isReadOnly.set(true);
          this.readOnlyReason.set('dialog.containerShiftOverride.readOnlyHasWork');
        }
        this.loadAvailableTasks();
        this.isLoading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        if (err?.status === HTTP_STATUS_NOT_FOUND) {
          return this.loadFromTemplate();
        }
        this.isLoading.set(false);
        this.lastError.set(err?.message ?? 'Failed to load override');
        return throwError(() => err);
      }),
      switchMap(() => of(undefined as void)),
    );
  }

  private loadFromTemplate(): Observable<void> {
    return this.templateApiService.getTemplates(this.containerId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(templates => {
        const weekdayIndex = this.weekdayNumber === -1 ? 1 : this.weekdayNumber;
        const template = templates.find(t =>
          this.isHoliday
            ? t.isHoliday || t.isWeekdayAndHoliday
            : t.weekday === weekdayIndex && !t.isHoliday,
        );
        if (template) {
          this.containerStartTime = this.containerStartTime ?? template.fromTime;
          this.containerEndTime = this.containerEndTime ?? template.untilTime;
          this.applyRouteValues(template.startBase, template.endBase, template.transportMode);
          this.initializeItemsFromTemplateItems(template.containerTemplateItems);
        }
        this.loadAvailableTasks();
        this.isLoading.set(false);
      }),
      switchMap(() => of(undefined as void)),
    );
  }

  loadAvailableTasks(): void {
    const fromTime = this.containerStartTime ?? '06:00';
    const untilTime = this.containerEndTime ?? '18:00';
    this.templateApiService
      .getAvailableTasks(
        this.containerId,
        this.weekdayNumber,
        fromTime,
        untilTime,
        undefined,
        undefined,
        this.isHoliday ? true : undefined,
        undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tasks => {
        this.availableShiftsAsIShift = tasks;
        this.availableShiftsVersion.update(v => v + 1);
      });
  }

  selectEmploymentTab(): void {
    this.isEmploymentTabActive.set(true);
    this.shiftService.setSelectedShift(null);
    if (this.containerAbsences().length === 0) {
      this.loadContainerAbsences();
    }
  }

  selectShiftsTab(): void {
    this.isEmploymentTabActive.set(false);
    this.shiftService.setSelectedShift(null);
  }

  private loadContainerAbsences(): void {
    this.dataAbsenceService.readAbsenceList()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([] as IAbsence[])),
      )
      .subscribe(absences => {
        this.containerAbsences.set(absences.filter(a => a.appliesToContainer));
      });
  }

  private applyRouteValues(
    startBase?: string,
    endBase?: string,
    transportMode?: ContainerTransportModeEnum,
  ): void {
    this.routeService.selectedStartBase = startBase ?? '';
    this.routeService.selectedEndBase = endBase ?? '';
    this.routeService.selectedTransportMode =
      transportMode ?? ContainerTransportModeEnum.byCar;
    this.routeService.isOverrideMode = true;
  }

  private initializeItemsFromOverride(override: IContainerShiftOverride): void {
    const items: IContainerTemplateItem[] = override.containerShiftOverrideItems.map(
      item => this.overrideItemToTemplateItem(item),
    );
    const sorted = this.containerStartTime && this.containerEndTime
      ? sortContainerItemsChronologically(items, this.containerStartTime, this.containerEndTime)
      : items;
    this.shiftService.setSelectedContainerTemplateItems(sorted);
  }

  private overrideItemToTemplateItem(item: IContainerShiftOverrideItem): IContainerTemplateItem {
    return {
      id: item.id,
      shiftId: item.shiftId,
      absenceId: item.absenceId,
      shift: item.shift,
      absence: item.absence,
      startItem: item.startItem,
      endItem: item.endItem,
      briefingTime: item.briefingTime ?? EMPTY_TIME,
      debriefingTime: item.debriefingTime ?? EMPTY_TIME,
      travelTimeBefore: item.travelTimeBefore ?? EMPTY_TIME,
      travelTimeAfter: item.travelTimeAfter ?? EMPTY_TIME,
      timeRangeStartItem: item.timeRangeStartItem ?? '',
      timeRangeEndItem: item.timeRangeEndItem ?? '',
      transportMode: item.transportMode,
    };
  }

  private initializeItemsFromTemplateItems(templateItems: IContainerTemplateItem[]): void {
    const items: IContainerTemplateItem[] = templateItems.map(item => ({
      ...item,
      id: undefined,
      tmpId: newGuid(),
      containerTemplateId: undefined,
    }));
    const sorted = this.containerStartTime && this.containerEndTime
      ? sortContainerItemsChronologically(items, this.containerStartTime, this.containerEndTime)
      : items;
    this.shiftService.setSelectedContainerTemplateItems(sorted);
  }

  save(): Observable<IContainerShiftOverride> {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    const overrideItems = this.buildOverrideItems(items);

    const payload: IContainerShiftOverride = {
      containerId: this.containerId,
      date: this.date,
      fromTime: this.getTimeFrom().toString(),
      untilTime: this.getTimeTo().toString(),
      startBase: this.routeService.selectedStartBase || undefined,
      endBase: this.routeService.selectedEndBase || undefined,
      transportMode: this.routeService.selectedTransportMode,
      hasWork: false,
      containerShiftOverrideItems: overrideItems,
    };

    const request$ = this.currentOverride?.id
      ? this.overrideApiService.putOverride(this.containerId, this.currentOverride.id, payload)
      : this.overrideApiService.postOverride(this.containerId, payload);

    return request$.pipe(
      tap(result => {
        this.currentOverride = result;
        this.isDirty.set(false);
      }),
    );
  }

  private buildOverrideItems(items: IContainerTemplateItem[]): IContainerShiftOverrideItem[] {
    return items.map(item => ({
      id: item.id,
      shiftId: item.shiftId,
      absenceId: item.absenceId,
      startItem: item.startItem,
      endItem: item.endItem,
      briefingTime: item.briefingTime ?? EMPTY_TIME,
      debriefingTime: item.debriefingTime ?? EMPTY_TIME,
      travelTimeBefore: item.travelTimeBefore ?? EMPTY_TIME,
      travelTimeAfter: item.travelTimeAfter ?? EMPTY_TIME,
      timeRangeStartItem: item.timeRangeStartItem ?? '',
      timeRangeEndItem: item.timeRangeEndItem ?? '',
      transportMode: item.transportMode as TransportModeEnum | undefined,
    }));
  }

  getTimeFrom(): OwnTime {
    if (this.containerStartTime) {
      const parts = this.containerStartTime.split(':');
      return OwnTime.forTime(
        (parts[0] ?? DEFAULT_TIME_FROM_HOURS).padStart(2, '0'),
        (parts[1] ?? DEFAULT_TIME_FROM_MINUTES).padStart(2, '0'),
      );
    }
    return OwnTime.forTime(DEFAULT_TIME_FROM_HOURS, DEFAULT_TIME_FROM_MINUTES);
  }

  getTimeTo(): OwnTime {
    if (this.containerEndTime) {
      const parts = this.containerEndTime.split(':');
      return OwnTime.forTime(
        (parts[0] ?? DEFAULT_TIME_TO_HOURS).padStart(2, '0'),
        (parts[1] ?? DEFAULT_TIME_TO_MINUTES).padStart(2, '0'),
      );
    }
    return OwnTime.forTime(DEFAULT_TIME_TO_HOURS, DEFAULT_TIME_TO_MINUTES);
  }

  updateStartTime(time: OwnTime): void {
    this.containerStartTime = `${time.hours}:${time.minutes}`;
  }

  updateEndTime(time: OwnTime): void {
    this.containerEndTime = `${time.hours}:${time.minutes}`;
  }

  markDirty(): void {
    this.isDirty.set(true);
  }

  reset(): void {
    if (!this.containerId) return;
    this.isDirty.set(false);
    this.isLoading.set(false);
    this.isReadOnly.set(false);
    this.readOnlyReason.set('');
    this.isEmploymentTabActive.set(false);
    this.currentOverride = null;
    this.shiftService.setSelectedShift(null);
    this.shiftService.setSelectedContainerTemplateItems([]);
  }
}
