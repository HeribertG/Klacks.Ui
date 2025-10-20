import { inject, Injectable, signal } from '@angular/core';
import {
  Break,
  BreakFilter,
  IBreak,
  IBreakFilter,
} from 'src/app/domain/models/break-class';
import { IClientBreak } from 'src/app/domain/models/client-class';
import { DataBreakService } from 'src/app/infrastructure/api/data-break.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from '../../models/entity-names.enum';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';

@Injectable({
  providedIn: 'root',
})
export class DataManagementBreakService implements ILoadable {
  private dataBreakService = inject(DataBreakService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private translateService = inject(TranslateService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();

  public isRead = signal(false);
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }
  public isUpdate = signal<IBreak | undefined>(undefined);
  public isAbsenceHeaderInit = signal(false);
  public resetScrollPosition$ = new Subject<void>();

  public breakFilter: IBreakFilter = new BreakFilter();
  public get currentFilter(): IBreakFilter {
    return this.breakFilter;
  }
  public clients: IClientBreak[] = [];
  private _restoreSearchSignal = signal('');
  public restoreSearch = {
    set: (value: string) => this._restoreSearchSignal.set(value),
  };
  public onExternalFilterChange?: () => void;
  private breakFilterDummy: IBreakFilter | undefined = undefined;

  canReadBreaks = false;

  private readonly INITIAL_CHUNK_SIZE = 100;
  private readonly LOAD_MORE_CHUNK_SIZE = 100;
  private _totalAvailableRows = 0;
  private _isLoadingMore = signal(false);
  private _currentChunkSize = 100;
  private _autoLoadEnabled = true;

  get isLoadingMore(): boolean {
    return this._isLoadingMore();
  }

  get hasMoreRows(): boolean {
    return this.clients.length < this._totalAvailableRows;
  }

  get loadingProgress(): number {
    if (this._totalAvailableRows === 0) return 0;
    return Math.round((this.clients.length / this._totalAvailableRows) * 100);
  }

  get totalAvailableRows(): number {
    return this._totalAvailableRows;
  }

  constructor() {
    this.registry.register(RouteName.ABSENCE, DataManagementBreakService);
  }

  reRead() {
    this.readYear();
  }

  readYear() {
    this._showProgressSpinner.set(true);
    if (this.canReadBreaks) {
      this.clients = [];
      this.breakFilter.startRow = 0;
      this.breakFilter.rowCount = this.INITIAL_CHUNK_SIZE;
      this._currentChunkSize = this.LOAD_MORE_CHUNK_SIZE;
      this._autoLoadEnabled = true;

      this.resetScrollPosition$.next();

      this.dataBreakService
        .getClientList(this.breakFilter)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.clients = this.processClientBreaks(response.clients);
            this._totalAvailableRows = response.totalCount;

            this.breakFilterDummy = cloneObject<IBreakFilter>(this.breakFilter);
            this._showProgressSpinner.set(false);
            this.isRead.set(true);

            setTimeout(() => this.isRead.set(false), 100);

            if (this._autoLoadEnabled && this.hasMoreRows) {
              setTimeout(() => this.autoLoadNextChunk(), 100);
            }
          },
          error: (err) => {
            console.error('Error loading the breaks:', err);
            this._showProgressSpinner.set(false);
          },
        });
    }
  }

  loadMoreRows(): void {
    if (!this.hasMoreRows || this._isLoadingMore()) {
      return;
    }

    this._isLoadingMore.set(true);
    this.breakFilter.startRow = this.clients.length;
    this.breakFilter.rowCount = this.LOAD_MORE_CHUNK_SIZE;

    this.dataBreakService
      .getClientList(this.breakFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const newClients = this.processClientBreaks(response.clients);
          this.clients.push(...newClients);

          if (newClients.length < this.LOAD_MORE_CHUNK_SIZE) {
            this._totalAvailableRows = this.clients.length;
          }

          this._isLoadingMore.set(false);
          this.isRead.set(true);
          setTimeout(() => this.isRead.set(false), 100);

          if (this._autoLoadEnabled && this.hasMoreRows) {
            setTimeout(() => this.autoLoadNextChunk(), 50);
          }
        },
        error: (err) => {
          console.error('Error loading more breaks:', err);
          this._isLoadingMore.set(false);
        },
      });
  }

  private autoLoadNextChunk(): void {
    if (!this._autoLoadEnabled || !this.hasMoreRows || this._isLoadingMore()) {
      return;
    }

    this._isLoadingMore.set(true);
    this.breakFilter.startRow = this.clients.length;
    this.breakFilter.rowCount = this._currentChunkSize;

    this.dataBreakService
      .getClientList(this.breakFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const newClients = this.processClientBreaks(response.clients);
          this.clients.push(...newClients);

          if (newClients.length < this._currentChunkSize) {
            this._totalAvailableRows = this.clients.length;
            this._autoLoadEnabled = false;
          } else {
            this._currentChunkSize = Math.min(this._currentChunkSize * 2, 800);
          }

          this._isLoadingMore.set(false);
          this.isRead.set(true);
          setTimeout(() => this.isRead.set(false), 100);

          if (this._autoLoadEnabled && this.hasMoreRows) {
            setTimeout(() => this.autoLoadNextChunk(), 50);
          }
        },
        error: (err) => {
          console.error('Error auto-loading breaks:', err);
          this._isLoadingMore.set(false);
          this._autoLoadEnabled = false;
        },
      });
  }

  private processClientBreaks(clientBreaks: IClientBreak[]): IClientBreak[] {
    return clientBreaks.map((client) => {
      if (client.breaks && Array.isArray(client.breaks)) {
        client.breaks = client.breaks.filter(
          (brk) =>
            brk &&
            typeof brk === 'object' &&
            Object.keys(brk).length > 0 &&
            brk.from &&
            brk.until
        );
      } else {
        client.breaks = [];
      }
      return client;
    });
  }

  readClientName(index: number): string {
    let result = '';
    if (index < this.clients.length) {
      const client = this.clients[index];
      result = `${client.firstName} ${client.name}`;
      if (!result.replace(/\s+/g, '')) {
        result = client.company;
      }
    }
    return result;
  }

  readData(index: number): IBreak[] | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client && client.breaks) {
        return client.breaks;
      }
    }
    return undefined;
  }

  get rows(): number {
    return this.clients.length;
  }

  addBreak(index: number, value: IBreak): boolean {
    if (index < this.clients.length) {
      const client = this.clients[index];

      if (!this.validateBreakDatesAgainstMembership(client, value)) {
        return false;
      }

      const tmp = value as Break;
      value.clientId = client.id!;
      delete tmp.id;
      delete tmp.absence;
      this.dataBreakService
        .addBreak(tmp)
        .pipe(takeUntil(this.destroy$))
        .subscribe((x: IBreak) => {
          client.breaks.push(x);
          client.breaks = this.sortBreaks(client.breaks);

          this.isUpdate.set(x);
        });
      return true;
    }
    return false;
  }

  deleteBreak(index: number, value: IBreak) {
    if (value.id) {
      this.dataBreakService
        .deleteBreak(value.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          const client = this.clients[index];
          client.breaks = this.sortBreaks(
            client.breaks.filter((obj) => obj.id !== value.id)
          );
          this.isUpdate.set(value);
          setTimeout(() => this.isUpdate.set(undefined), 100);
        });
    }
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

  async updateBreak(index: number, value: IBreak) {
    if (index < 0 || index >= this.clients.length) {
      return;
    }

    const client = this.clients[index];

    if (!client) {
      return;
    }

    if (!this.validateBreakDatesAgainstMembership(client, value)) {
      return;
    }

    return this.dataBreakService
      .updateBreak(value as Break)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        client.breaks = this.sortBreaks(client.breaks);
        this.isUpdate.set(value);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
  }

  indexOfBreak(value: IBreak): number {
    const client = this.clients.find((x) => x.id === value.clientId);
    if (client) {
      return client.breaks.findIndex((x) => x.id === value.id);
    }
    return -1;
  }

  private sortBreaks(value: IBreak[]): IBreak[] {
    return value.sort((a: IBreak, b: IBreak) => {
      const da = new Date(a.from!).getTime();
      const db = new Date(b.from!).getTime();

      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  private validateBreakDatesAgainstMembership(
    client: IClientBreak,
    breakItem: IBreak
  ): boolean {
    if (!client.membership) {
      return true;
    }

    const membership = client.membership;
    const breakFrom = new Date(breakItem.from!);
    const breakUntil = new Date(breakItem.until!);

    const membershipValidFrom = membership.validFrom
      ? new Date(membership.validFrom)
      : null;
    const membershipValidUntil = membership.validUntil
      ? new Date(membership.validUntil)
      : null;

    if (membershipValidFrom && breakFrom < membershipValidFrom) {
      this.translateService
        .get('absence-gantt.validation.membership.before-start')
        .pipe(takeUntil(this.destroy$))
        .subscribe((message) => {
          const formattedMessage = message.replace(
            '{0}',
            membershipValidFrom.toLocaleDateString()
          );
          this.eventBus.emit(DomainEventType.ERROR, {
            message: formattedMessage,
            code: 'membership-validation-error',
            context:
              'DataManagementBreakService.validateBreakDatesAgainstMembership',
          });
        });
      return false;
    }

    if (membershipValidUntil && breakUntil > membershipValidUntil) {
      this.translateService
        .get('absence-gantt.validation.membership.after-end')
        .pipe(takeUntil(this.destroy$))
        .subscribe((message) => {
          const formattedMessage = message.replace(
            '{0}',
            membershipValidUntil.toLocaleDateString()
          );
          this.eventBus.emit(DomainEventType.ERROR, {
            message: formattedMessage,
            code: 'membership-validation-error',
            context:
              'DataManagementBreakService.validateBreakDatesAgainstMembership',
          });
        });
      return false;
    }

    if (
      membershipValidFrom &&
      membershipValidUntil &&
      (breakFrom < membershipValidFrom || breakUntil > membershipValidUntil)
    ) {
      this.translateService
        .get('absence-gantt.validation.membership.outside-period')
        .pipe(takeUntil(this.destroy$))
        .subscribe((message) => {
          const formattedMessage = message
            .replace('{0}', membershipValidFrom.toLocaleDateString())
            .replace('{1}', membershipValidUntil.toLocaleDateString());
          this.eventBus.emit(DomainEventType.ERROR, {
            message: formattedMessage,
            code: 'membership-validation-error',
            context:
              'DataManagementBreakService.validateBreakDatesAgainstMembership',
          });
        });
      return false;
    }

    return true;
  }

  private isFilter_Dirty(): boolean {
    const a = this.breakFilter as BreakFilter;
    const b = this.breakFilterDummy as BreakFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
