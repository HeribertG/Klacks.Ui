/* eslint-disable @typescript-eslint/no-unused-vars */
import { inject, Injectable, signal } from '@angular/core';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import {
  ITruncatedClient,
  Filter,
  IClient,
  CheckBoxValue,
  ExportClient,
  IClientAttribute,
} from 'src/app/domain/models/client/client-class';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';
import { Observable, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ClientListService {
  private dataClientService = inject(DataClientService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private destroy$ = new Subject<void>();

  public listWrapper = signal<ITruncatedClient | undefined>(undefined);
  public paginationDataService = signal<IPaginationDataService | undefined>(
    undefined
  );
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public checkedArray = signal<CheckBoxValue[]>([]);
  public headerCheckBoxValue = signal(false);

  public readPage(currentFilter: Filter, clientAttribute: IClientAttribute[]) {
    if (currentFilter.isFilterValid()) {
      this._showProgressSpinner.set(true);
      this.dataClientService.readClientList(currentFilter)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (x) => {
            if (!x || !x.clients) {
              console.warn('readPage: Empty or invalid response received');
              this._showProgressSpinner.set(false);
              return;
            }

            x.clients.forEach((z: IClient) => {
              if (z) {
                const res = clientAttribute.find((y) => +y.type === +z.type);
                if (res) {
                  z.typeAbbreviation = res.name.substring(0, 1);
                }
              }
            });

            this.updateListWrapper(x, currentFilter);
          },
          error: (err) => {
            console.error('Error reading client list:', err);
            this._showProgressSpinner.set(false);
          },
        });
    }
  }

  private updateListWrapper(x: ITruncatedClient, currentFilter: Filter) {
    this.listWrapper.set(x);
    this.paginationDataService.set({
      maxItems: x.maxItems,
      firstItem: x.firstItemOnPage,
      maxPages: x.maxPages,
    });

    this._showProgressSpinner.set(false);
  }

  public deleteClient(key: string): Observable<IClient> {
    return this.dataClientService.deleteClient(key);
  }

  public exportExcel(currentFilter: Filter) {
    const filter = new ExportClient();
    filter.filter = currentFilter;
    filter.selectAll = !this.checkBoxIndeterminate();

    if (this.headerCheckBoxValue() === true) {
      const tmp = this.checkedArray().find((x) => x.checked === false);
      if (tmp) {
        filter.invertedSelection = true;
      }
    }

    this.checkedArray().forEach((x) => {
      return filter.selection.push(x.id);
    });

    this.eventBus.emit(DomainEventType.INFO, {
      message: DomainMessages.PLEASE_BE_PATIENT_EXCEL,
      context: 'PLEASE_BE_PATIENT_EXCEL'
    });
  }

  public clearCheckedArray() {
    this.checkedArray.set([]);
  }

  public addCheckBoxValueToArray(value: CheckBoxValue) {
    this.checkedArray.update((arr) => [...arr, value]);
  }

  public findCheckBoxValue(key: string): CheckBoxValue | undefined {
    if (!this.checkedArray() || key === '') {
      return undefined;
    }
    return this.checkedArray().find((x) => x.id === key);
  }

  public removeCheckBoxValueToArray(key: string) {
    this.checkedArray.update((arr) => arr.filter((x) => x.id !== key));
  }

  public checkBoxIndeterminate(): boolean {
    const currentHeaderValue = this.headerCheckBoxValue();

    if (currentHeaderValue === true) {
      return this.checkedArray().some((x) => !x.checked);
    }
    if (currentHeaderValue === false) {
      return this.checkedArray().some((x) => x.checked);
    }

    return false;
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
