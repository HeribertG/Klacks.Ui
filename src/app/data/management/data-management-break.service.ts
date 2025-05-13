import { inject, Injectable, signal } from '@angular/core';
import {
  Break,
  BreakFilter,
  IBreak,
  IBreakFilter,
} from 'src/app/core/break-class';
import { IClientBreak } from 'src/app/core/client-class';
import { ToastService } from 'src/app/toast/toast.service';
import { DataBreakService } from '../data-break.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Injectable({
  providedIn: 'root',
})
export class DataManagementBreakService {
  public dataBreakService = inject(DataBreakService);
  public toastService = inject(ToastService);

  public isRead = signal(false);
  public showProgressSpinner = signal(false);
  public isUpdate = signal<IBreak | undefined>(undefined);
  public isAbsenceHeaderInit = signal(false);

  public breakFilter: IBreakFilter = new BreakFilter();
  public clients: IClientBreak[] = [];
  private breakFilterDummy: IBreakFilter | undefined = undefined;

  // only when DataManagementAbsenceGanttService has loaded its AbsenceFilter,
  // can be read. The AbsenceFilter is integrated in the breakFilter.
  canReadBreaks = false;

  reRead() {
    this.readYear();
  }

  readYear() {
    this.showProgressSpinner.set(true);
    if (this.canReadBreaks) {
      this.clients = [];

      this.dataBreakService.getClientList(this.breakFilter).subscribe({
        next: (clientBreaks) => {
          this.clients = clientBreaks.map((client) => {
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

          this.breakFilterDummy = cloneObject<IBreakFilter>(this.breakFilter);
          this.showProgressSpinner.set(false);
          this.isRead.set(true);

          setTimeout(() => this.isRead.set(false), 100);
        },
        error: (err) => {
          console.error('Error loading the breaks:', err);
          this.showProgressSpinner.set(false);
        },
      });
    }
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

  addBreak(index: number, value: IBreak) {
    if (index < this.clients.length) {
      const client = this.clients[index];
      const tmp = value as Break;
      value.clientId = client.id!;
      delete tmp.id;
      delete tmp.absence;
      this.dataBreakService.addBreak(tmp).subscribe((x) => {
        client.breaks.push(x);
        client.breaks = this.sortBreaks(client.breaks);

        this.isUpdate.set(x);
      });
    }
  }

  deleteBreak(index: number, value: IBreak) {
    if (value.id) {
      this.dataBreakService.deleteBreak(value.id!).subscribe(() => {
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
    return this.dataBreakService.updateBreak(value as Break).subscribe(() => {
      const client = this.clients[index];
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

  showInfo(Message: string, infoName = '') {
    if (infoName) {
      const y = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(y);
    }
    this.toastService.show(Message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
    });
  }

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }

  private sortBreaks(value: IBreak[]): IBreak[] {
    return value.sort((a: IBreak, b: IBreak) => {
      const da = new Date(a.from!).getTime();
      const db = new Date(b.from!).getTime();

      return da < db ? -1 : da > db ? 1 : 0;
    });
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
