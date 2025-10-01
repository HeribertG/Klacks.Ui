/* eslint-disable @typescript-eslint/no-unused-vars */
import { inject, Injectable, signal } from '@angular/core';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import {
  ITruncatedClient,
  Filter,
  IClient,
  CheckBoxValue,
  ExportClient,
  IClientAttribute,
} from 'src/app/domain/models/client-class';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { IPaginationDataService } from 'src/app/presentation/shared/pagination/pagination.component';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClientListService {
  private dataClientService = inject(DataClientService);
  private toastShowService = inject(ToastShowService);

  public listWrapper = signal<ITruncatedClient | undefined>(undefined);
  public paginationDataService = signal<IPaginationDataService | undefined>(
    undefined
  );
  public showProgressSpinner = signal(false);
  public checkedArray = signal<CheckBoxValue[]>([]);
  public headerCheckBoxValue = signal(false);

  private currentFilterDummy: Filter | undefined;

  public readPage(currentFilter: Filter, clientAttribute: IClientAttribute[]) {
    if (currentFilter.isFilterValid()) {
      this.showProgressSpinner.set(true);
      this.dataClientService.readClientList(currentFilter).subscribe({
        next: (x) => {
          if (!x || !x.clients) {
            console.warn('readPage: Empty or invalid response received');
            this.showProgressSpinner.set(false);
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
          this.showProgressSpinner.set(false);
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

    // Assuming isFilter_Dirty is a method that compares currentFilter with a stored one
    // this.currentFilterDummy = cloneObject<Filter>(currentFilter);

    this.showProgressSpinner.set(false);
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

    this.toastShowService.showInfo(
      MessageLibrary.PLEASE_BE_PATIENT_EXCEL,
      'PLEASE_BE_PATIENT_EXCEL'
    );
    // The actual export call seems to be missing in the original code
    // this.dataClientService.exportExcel(filter).subscribe(...);
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
}
