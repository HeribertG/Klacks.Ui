// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BreakPlaceholder,
  BreakFilter,
  IBreakPlaceholder,
  IBreakFilter,
} from 'src/app/domain/models/break/break-class';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { IClientBreak } from 'src/app/domain/models/client/client-class';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { ClientSortPreferenceService } from 'src/app/domain/services/schedule/client-sort-preference.service';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { formatClientDisplayName } from 'src/app/shared/helpers/client-name.helper';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from '../../enums/entity-names.enum';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { TranslateService } from '@ngx-translate/core';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementBreakPlaceholderService implements ILoadable {
  private dataBreakPlaceholderService = inject(DataBreakPlaceholderService);
  private readonly clientSortPreference = inject(ClientSortPreferenceService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private translateService = inject(TranslateService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroyRef = inject(DestroyRef);

  public isRead = signal(false);
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }
  public isUpdate = signal<IBreakPlaceholder | undefined>(undefined);
  public isAbsenceHeaderInit = signal(false);
  public resetScrollPositionTrigger = signal<number>(0);

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
    this.registry.register(RouteName.ABSENCE, DataManagementBreakPlaceholderService);
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

      this.resetScrollPositionTrigger.update((v) => v + 1);

      this.dataBreakPlaceholderService
        .getClientList(this.breakFilter)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            const raw = this.processClientBreaks(response.clients);
            this.clients = this.breakFilter.individualSort
              ? this.clientSortPreference.applyTo(raw as (IClientBreak & { id: string })[])
              : raw;
            this._totalAvailableRows = response.totalCount;

            this.breakFilterDummy = cloneObject<IBreakFilter>(this.breakFilter);
            this._showProgressSpinner.set(false);
            this.isRead.set(true);

            resetSignalAfterDelay(this.isRead);

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

    this.dataBreakPlaceholderService
      .getClientList(this.breakFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const newClients = this.processClientBreaks(response.clients);
          this.clients.push(...newClients);

          if (newClients.length < this.LOAD_MORE_CHUNK_SIZE) {
            this._totalAvailableRows = this.clients.length;
          }

          this._isLoadingMore.set(false);
          this.isRead.set(true);
          resetSignalAfterDelay(this.isRead);

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

    this.dataBreakPlaceholderService
      .getClientList(this.breakFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
          resetSignalAfterDelay(this.isRead);

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
      if (client.breakPlaceholders && Array.isArray(client.breakPlaceholders)) {
        client.breakPlaceholders = client.breakPlaceholders.filter(
          (brk) =>
            brk &&
            typeof brk === 'object' &&
            Object.keys(brk).length > 0 &&
            brk.from &&
            brk.until
        );
      } else {
        client.breakPlaceholders = [];
      }
      return client;
    });
  }

  readClientName(index: number): string {
    if (index < this.clients.length) {
      return formatClientDisplayName(this.clients[index]);
    }
    return '';
  }

  readData(index: number): IBreakPlaceholder[] | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client && client.breakPlaceholders) {
        return client.breakPlaceholders;
      }
    }
    return undefined;
  }

  get rows(): number {
    return this.clients.length;
  }

  addBreak(index: number, value: IBreakPlaceholder): boolean {
    if (value.entrySource === EntrySource.Schedule) {
      return false;
    }
    if (index < this.clients.length) {
      const client = this.clients[index];

      if (!this.validateBreakDatesAgainstMembership(client, value)) {
        return false;
      }

      const tmp = value as BreakPlaceholder;
      value.clientId = client.id!;
      delete tmp.id;
      delete tmp.absence;
      this.dataBreakPlaceholderService
        .addBreak(tmp)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((x: IBreakPlaceholder) => {
          client.breakPlaceholders.push(x);
          client.breakPlaceholders = this.sortBreaks(client.breakPlaceholders);

          this.isUpdate.set(x);
        });
      return true;
    }
    return false;
  }

  deleteBreak(index: number, value: IBreakPlaceholder) {
    if (value.entrySource === EntrySource.Schedule) {
      return;
    }
    if (value.id) {
      this.dataBreakPlaceholderService
        .deleteBreak(value.id!)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          const client = this.clients[index];
          client.breakPlaceholders = this.sortBreaks(
            client.breakPlaceholders.filter((obj) => obj.id !== value.id)
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

  async updateBreak(index: number, value: IBreakPlaceholder) {
    if (value.entrySource === EntrySource.Schedule) {
      return;
    }
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

    return this.dataBreakPlaceholderService
      .updateBreak(value as BreakPlaceholder)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        client.breakPlaceholders = this.sortBreaks(client.breakPlaceholders);
        this.isUpdate.set(value);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
  }

  indexOfBreak(value: IBreakPlaceholder): number {
    const client = this.clients.find((x) => x.id === value.clientId);
    if (client) {
      return client.breakPlaceholders.findIndex((x) => x.id === value.id);
    }
    return -1;
  }

  private sortBreaks(value: IBreakPlaceholder[]): IBreakPlaceholder[] {
    return value.sort((a: IBreakPlaceholder, b: IBreakPlaceholder) => {
      const da = new Date(a.from!).getTime();
      const db = new Date(b.from!).getTime();

      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  private validateBreakDatesAgainstMembership(
    client: IClientBreak,
    breakItem: IBreakPlaceholder
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
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((message) => {
          const formattedMessage = message.replace(
            '{0}',
            membershipValidFrom.toLocaleDateString()
          );
          this.eventBus.emit(DomainEventType.ERROR, {
            message: formattedMessage,
            code: 'membership-validation-error',
            context:
              'DataManagementBreakPlaceholderService.validateBreakDatesAgainstMembership',
          });
        });
      return false;
    }

    if (membershipValidUntil && breakUntil > membershipValidUntil) {
      this.translateService
        .get('absence-gantt.validation.membership.after-end')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((message) => {
          const formattedMessage = message.replace(
            '{0}',
            membershipValidUntil.toLocaleDateString()
          );
          this.eventBus.emit(DomainEventType.ERROR, {
            message: formattedMessage,
            code: 'membership-validation-error',
            context:
              'DataManagementBreakPlaceholderService.validateBreakDatesAgainstMembership',
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
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((message) => {
          const formattedMessage = message
            .replace('{0}', membershipValidFrom.toLocaleDateString())
            .replace('{1}', membershipValidUntil.toLocaleDateString());
          this.eventBus.emit(DomainEventType.ERROR, {
            message: formattedMessage,
            code: 'membership-validation-error',
            context:
              'DataManagementBreakPlaceholderService.validateBreakDatesAgainstMembership',
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
}
