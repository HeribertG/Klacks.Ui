// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  inject,
  Injectable,
  signal,
  effect,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import {
  IClientWork,
  IWork,
  IWorkFilter,
  WorkFilter,
} from 'src/app/domain/models/schedule/schedule-class';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
} from 'src/app/domain/models/schedule/shift-schedule-class';
import {
  IPeriodHours,
  IScheduleCell,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/schedule/work-schedule-class';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { DataManagementWorkService } from '../work/data-management-work.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import {
  ScheduleEntryCrudService,
  DeleteWorkScheduleEntryParams,
  ScheduleCellParams,
  BreakCellParams,
} from './schedule-entry-crud.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService implements ILoadable {
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private injector = inject(Injector);

  private breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  private shiftLoader = inject(ShiftScheduleLoaderService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private workCrud = inject(DataManagementWorkService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);

  constructor() {
    this.registry.register(RouteName.SCHEDULE, DataManagementScheduleService);
    this.setupCrudEffects();
  }

  private setupCrudEffects(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.scheduleEntryCrud.scheduleRefreshed()) {
          this.isRead.set({ value: true, resetScroll: false });
          setTimeout(
            () => this.isRead.set({ value: false, resetScroll: false }),
            100,
          );
        }
      });

      effect(() => {
        if (this.scheduleEntryCrud.shiftScheduleRefreshed()) {
          this.isShiftScheduleRead.set({ value: true, resetScroll: false });
          setTimeout(
            () =>
              this.isShiftScheduleRead.set({
                value: false,
                resetScroll: false,
              }),
            100,
          );
        }
      });

      effect(() => {
        if (this.breakPlaceholderLoader.isLoaded()) {
          if (this.showBreakPlaceholders()) {
            this.workScheduleLoader.applyBreakPlaceholderRows();
            this.isRead.set({ value: true, resetScroll: false });
            setTimeout(
              () => this.isRead.set({ value: false, resetScroll: false }),
              100,
            );
          }
        }
      });
    });
  }

  public showBreakPlaceholders = signal(false);
  public showAvailability = signal(false);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal<{ value: boolean; resetScroll: boolean }>({
    value: false,
    resetScroll: true,
  });
  public isShiftScheduleRead = signal<{ value: boolean; resetScroll: boolean }>(
    { value: false, resetScroll: true },
  );
  public isWorkScheduleRead = signal(false);

  public workFilter: IWorkFilter = new WorkFilter();
  public get currentFilter(): IWorkFilter {
    return this.workFilter;
  }
  public holidayDates: Date[] = [];

  private _restoreSearchSignal = signal('');
  public restoreSearch = {
    set: (value: string) => this._restoreSearchSignal.set(value),
  };
  public onExternalFilterChange?: () => void;

  private workFilterDummy: IWorkFilter | undefined = undefined;

  get isUpdate() {
    return this.workCrud.isUpdate;
  }

  get shiftScheduleFilter(): IShiftScheduleFilter {
    return this.shiftLoader.shiftScheduleFilter;
  }

  get shiftSchedules(): IShiftSchedule[] {
    return this.shiftLoader.shiftSchedules;
  }

  get clients(): IClientWork[] {
    return this.workScheduleLoader.clients;
  }

  get workScheduleEntries(): IScheduleCell[] {
    return this.workScheduleLoader.workScheduleEntries;
  }

  get workScheduleByClientAndDate(): WorkScheduleByClientAndDate {
    return this.workScheduleLoader.workScheduleByClientAndDate;
  }

  get periodHours(): Map<string, IPeriodHours> {
    return this.workScheduleLoader.periodHours;
  }

  get clientAvailabilities(): Map<string, Map<string, string>> {
    return this.workScheduleLoader.clientAvailabilities;
  }

  get visibleStartDate(): Date | null {
    return this.workScheduleLoader.startDate;
  }

  get visibleEndDate(): Date | null {
    return this.workScheduleLoader.endDate;
  }

  get availableShiftsByDay(): readonly (readonly string[])[] {
    return this.availableShiftsCalc.availableShiftsByDay;
  }

  get overbookedShiftsByDay(): readonly (readonly string[])[] {
    return this.availableShiftsCalc.overbookedShiftsByDay;
  }

  get hasAvailabilityData(): boolean {
    return this.workScheduleLoader.clientAvailabilities.size > 0;
  }

  get isLoadingMore(): boolean {
    return this.shiftLoader.isLoadingMore;
  }

  get hasMoreShifts(): boolean {
    return this.shiftLoader.hasMoreShifts;
  }

  get shiftLoadingProgress(): number {
    return this.shiftLoader.shiftLoadingProgress;
  }

  get totalAvailableShifts(): number {
    return this.shiftLoader.totalAvailableShifts;
  }

  get rows(): number {
    return this.clients.length;
  }

  readDatas() {
    this._showProgressSpinner.set(true);
    const dates = this.workScheduleLoader.calculateVisibleDates(
      this.workFilter,
    );
    this.readWorkSchedule();
    this.readShiftSchedule(true, dates.startDate, dates.endDate);
    this.breakPlaceholderLoader.load(
      dates.startDate,
      dates.endDate,
      this.workFilter,
    );
  }

  readShiftSchedule(resetScroll = true, startDate?: string, endDate?: string) {
    const dates =
      startDate && endDate
        ? { startDate, endDate }
        : this.workScheduleLoader.calculateVisibleDates(this.workFilter);

    this.shiftLoader.load(
      dates.startDate,
      dates.endDate,
      this.workFilter,
      this.holidayDates,
      () => {
        this.availableShiftsCalc.calculate(
          this.shiftSchedules,
          this.workFilter,
        );
        this.isShiftScheduleRead.set({ value: true, resetScroll });
        setTimeout(
          () => this.isShiftScheduleRead.set({ value: false, resetScroll }),
          100,
        );
      },
    );
  }

  readWorkSchedule(resetScroll = true) {
    this.workScheduleLoader.load(this.workFilter, () => {
      this.workFilterDummy = cloneObject<IWorkFilter>(this.workFilter);
      this._showProgressSpinner.set(false);
      this.isRead.set({ value: true, resetScroll });
      setTimeout(() => this.isRead.set({ value: false, resetScroll }), 100);
      this.isWorkScheduleRead.set(true);
      setTimeout(() => this.isWorkScheduleRead.set(false), 100);
    });
  }

  readData(index: number): IWork[] | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client && client.works) {
        return client.works;
      }
    }
    return undefined;
  }

  readClientId(index: number): string | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client) {
        return client.id;
      }
    }
    return undefined;
  }

  getWorkScheduleForClientAndDate(
    clientId: string,
    date: Date,
  ): IScheduleCell[] {
    return this.workScheduleLoader.getWorkScheduleForClientAndDate(
      clientId,
      date,
    );
  }

  getMaxEntriesPerClientAndDate(): Map<string, number> {
    return this.workScheduleLoader.getMaxEntriesPerClientAndDate();
  }

  addWork(index: number, value: IWork) {
    this.workCrud.addWork(this.workScheduleLoader.clients, index, value);
  }

  deleteWork(index: number, value: IWork) {
    this.workCrud.deleteWork(this.workScheduleLoader.clients, index, value);
  }

  async updateWork(index: number, value: IWork) {
    this.workCrud.updateWork(this.workScheduleLoader.clients, index, value);
  }

  indexOfWork(value: IWork): number {
    return this.workCrud.indexOfWork(this.workScheduleLoader.clients, value);
  }

  addWorkScheduleEntry(params: {
    clientId: string;
    date: Date;
    shiftId: string;
    workTime: number;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    return this.scheduleEntryCrud.addWorkScheduleEntry(params, this.workFilter);
  }

  deleteWorkScheduleEntry(
    id: string,
    sourceId: string,
    clientId: string,
    date: Date,
    entryId: string,
    entryType: number,
  ): void {
    this.scheduleEntryCrud.deleteWorkScheduleEntry(
      { id, sourceId, clientId, date, entryId, entryType },
      this.workFilter,
    );
  }

  bulkDeleteWorkScheduleEntries(
    entries: DeleteWorkScheduleEntryParams[],
  ): void {
    this.scheduleEntryCrud.bulkDeleteWorkScheduleEntries(
      entries,
      this.workFilter,
    );
  }

  bulkAddWorkScheduleEntries(entries: ScheduleCellParams[]): Promise<void> {
    return this.scheduleEntryCrud.bulkAddWorkScheduleEntries(
      entries,
      this.workFilter,
    );
  }

  bulkAddBreakScheduleEntries(entries: BreakCellParams[]): Promise<void> {
    return this.scheduleEntryCrud.bulkAddBreakScheduleEntries(entries);
  }

  refreshClientScheduleForDays(
    clientId: string,
    centerDate: Date,
  ): Promise<void> {
    return this.scheduleEntryCrud.refreshClientScheduleForDays(
      clientId,
      centerDate,
    );
  }

  refreshClientScheduleForDateRange(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    return this.scheduleEntryCrud.refreshClientScheduleForDateRange(clientId, startDate, endDate);
  }

  private isFilter_Dirty(): boolean {
    const a = this.workFilter as IWorkFilter;
    const b = this.workFilterDummy as IWorkFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  toggleAvailability(): void {
    this.showAvailability.update(v => !v);
    this.isRead.set({ value: true, resetScroll: false });
    setTimeout(
      () => this.isRead.set({ value: false, resetScroll: false }),
      100,
    );
  }

  toggleBreakPlaceholders(): void {
    const newValue = !this.showBreakPlaceholders();
    this.showBreakPlaceholders.set(newValue);
    this.breakPlaceholderLoader.visible = newValue;

    if (newValue) {
      this.workScheduleLoader.applyBreakPlaceholderRows();
    } else {
      this.workScheduleLoader.resetToNeededRows();
    }

    this.isRead.set({ value: true, resetScroll: false });
    setTimeout(
      () => this.isRead.set({ value: false, resetScroll: false }),
      100,
    );
  }

  public destroy(): void {
    this.workCrud.destroy();
  }
}
