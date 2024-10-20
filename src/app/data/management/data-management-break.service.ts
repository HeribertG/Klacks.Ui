import { Injectable, signal } from '@angular/core';
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
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementBreakService {
  public isReset = signal(false);
  public isRead = signal(false);
  public showProgressSpinner = signal(false);
  public isUpdate = new Subject<IBreak>(); //Zeichnet die selektierte Zeile neu
  public isAbsenceHeaderInit = new Subject<boolean>();

  breakFilter: IBreakFilter = new BreakFilter();
  clients: IClientBreak[] = [];
  private breakFilterDummy: IBreakFilter | undefined = undefined;

  // erst wenn DataManagementAbsenceGanttService seine AbsenceFilter geladen hat,
  // kann gelesen werden. Der AbsenceFilter wird im breakFilter integriert.
  canReadBreaks = false;

  constructor(
    public dataBreakService: DataBreakService,
    public toastService: ToastService
  ) {}

  reRead() {
    this.readYear();
  }
  readYear() {
    this.showProgressSpinner.set(true);
    if (this.isFilter_Dirty() && this.canReadBreaks) {
      this.clients = [];

      this.dataBreakService.getClientList(this.breakFilter).subscribe((x) => {
        this.clients = x;
        this.breakFilterDummy = cloneObject(this.breakFilter);
        this.showProgressSpinner.set(false);
        this.isRead.set(true);
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
        this.isUpdate.next(x);
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
        this.isUpdate.next(value);
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
      this.isUpdate.next(value);
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
      var da = new Date(a.from!).getTime();
      var db = new Date(b.from!).getTime();

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
