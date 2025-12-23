import { inject, Injectable, signal, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IClientWork,
  IWork,
  IWorkFilter,
  WorkFilter,
} from 'src/app/domain/models/schedule-class';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
} from 'src/app/domain/models/shift-schedule-class';
import {
  IWorkScheduleEntry,
  IWorkScheduleFilter,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { WorkCrudService } from './work-crud.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService implements ILoadable {
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroyRef = inject(DestroyRef);
  private dataWorkSchedule = inject(DataWorkScheduleService);

  private shiftLoader = inject(ShiftScheduleLoaderService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private workCrud = inject(WorkCrudService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);

  constructor() {
    this.registry.register(
      RouteName.SCHEDULE,
      DataManagementScheduleService
    );
  }

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal<{ value: boolean; resetScroll: boolean }>({ value: false, resetScroll: true });
  public isShiftScheduleRead = signal<{ value: boolean; resetScroll: boolean }>({ value: false, resetScroll: true });
  public isWorkScheduleRead = signal(false);

  public workFilter: IWorkFilter = new WorkFilter();
  public get currentFilter(): IWorkFilter { return this.workFilter; }
  public holidayDates: Date[] = [];

  private _restoreSearchSignal = signal('');
  public restoreSearch = { set: (value: string) => this._restoreSearchSignal.set(value) };
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

  get workScheduleEntries(): IWorkScheduleEntry[] {
    return this.workScheduleLoader.workScheduleEntries;
  }

  get workScheduleByClientAndDate(): WorkScheduleByClientAndDate {
    return this.workScheduleLoader.workScheduleByClientAndDate;
  }

  get availableShiftsByDay(): readonly (readonly string[])[] {
    return this.availableShiftsCalc.availableShiftsByDay;
  }

  get overbookedShiftsByDay(): readonly (readonly string[])[] {
    return this.availableShiftsCalc.overbookedShiftsByDay;
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
    this.readWorkSchedule();
    this.readShiftSchedule();
  }

  readShiftSchedule(resetScroll = true) {
    this.shiftLoader.load(
      this.workFilter,
      this.holidayDates,
      () => {
        this.availableShiftsCalc.calculate(this.shiftSchedules, this.workFilter);
        this.isShiftScheduleRead.set({ value: true, resetScroll });
        setTimeout(() => this.isShiftScheduleRead.set({ value: false, resetScroll }), 100);
      }
    );
  }

  readWorkSchedule() {
    this.workScheduleLoader.load(
      this.workFilter,
      () => {
        this.workFilterDummy = cloneObject<IWorkFilter>(this.workFilter);
        this._showProgressSpinner.set(false);
        this.isRead.set({ value: true, resetScroll: true });
        setTimeout(() => this.isRead.set({ value: false, resetScroll: true }), 100);
        this.isWorkScheduleRead.set(true);
        setTimeout(() => this.isWorkScheduleRead.set(false), 100);
      }
    );
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

  getWorkScheduleForClientAndDate(clientId: string, date: Date): IWorkScheduleEntry[] {
    return this.workScheduleLoader.getWorkScheduleForClientAndDate(clientId, date);
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
  }): void {
    this.workCrud.createWork(params).then(() => {
      this.refreshClientScheduleForDays(params.clientId, params.date);
      this.readShiftSchedule(false);
    });
  }

  deleteWorkScheduleEntry(workId: string, clientId: string, date: Date): void {
    this.workCrud.deleteWorkById(workId).then(() => {
      this.refreshClientScheduleForDays(clientId, date);
      this.readShiftSchedule(false);
    });
  }

  public refreshClientScheduleForDays(clientId: string, centerDate: Date): void {
    const startDate = addDays(centerDate, -1);
    const endDate = addDays(centerDate, 1);

    const filter: IWorkScheduleFilter = {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
    };

    this.dataWorkSchedule.getWorkSchedule(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const clientEntries = response.entries.filter(e => e.clientId === clientId);
          this.workScheduleLoader.replaceClientEntriesForDays(clientId, startDate, endDate, clientEntries);

          this.isRead.set({ value: true, resetScroll: false });
          setTimeout(() => this.isRead.set({ value: false, resetScroll: false }), 100);
        },
        error: (err) => {
          console.error('Error refreshing schedule:', err);
        },
      });
  }

  private isFilter_Dirty(): boolean {
    const a = this.workFilter as IWorkFilter;
    const b = this.workFilterDummy as IWorkFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  public destroy(): void {
    this.workCrud.destroy();
  }
}
