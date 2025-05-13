import { inject, Injectable, signal } from '@angular/core';
import {
  IClientWork,
  IWork,
  IWorkFilter,
  Work,
  WorkFilter,
} from 'src/app/core/schedule-class';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ToastService } from 'src/app/toast/toast.service';
import { DataScheduleService } from '../data-schedule.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService {
  public toastService = inject(ToastService);
  private dataSchedule = inject(DataScheduleService);

  public isRead = signal(false);
  public isUpdate = signal<IWork | undefined>(undefined); //Zeichnet die selektierte Zeile neu
  public showProgressSpinner = signal(false);

  public workFilter: IWorkFilter = new WorkFilter();
  public clients: IClientWork[] = [];

  private workFilterDummy: IWorkFilter | undefined = undefined;

  readDatas() {
    this.showProgressSpinner.set(true);
    this.dataSchedule.getClientList(this.workFilter).subscribe((x) => {
      this.clients = x;
      this.workFilterDummy = cloneObject<IWorkFilter>(this.workFilter);
      this.isRead.set(true);
      this.showProgressSpinner.set(false);
      setTimeout(() => this.isRead.set(false), 100);
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
  get rows(): number {
    return this.clients.length;
  }

  addWork(index: number, value: IWork) {
    if (index < this.clients.length) {
      const client = this.clients[index];
      const tmp = value as Work;
      value.clientId = client.id!;
      delete tmp.id;
      this.dataSchedule.addWork(tmp).subscribe((x) => {
        client.works.push(x);
        client.works = this.sortWorks(client.works);
        this.isUpdate.set(x);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
    }
  }

  deleteWork(index: number, value: IWork) {
    if (value.id) {
      this.dataSchedule.deleteWork(value.id!).subscribe(() => {
        const client = this.clients[index];
        client.works = this.sortWorks(
          client.works.filter((obj) => obj.id !== value.id)
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

  async updateWork(index: number, value: IWork) {
    return this.dataSchedule.updateWork(value as Work).subscribe(() => {
      const client = this.clients[index];
      client.works = this.sortWorks(client.works);
      this.isUpdate.set(value);
      setTimeout(() => this.isUpdate.set(undefined), 100);
    });
  }

  indexOfWork(value: IWork): number {
    const client = this.clients.find((x) => x.id === value.clientId);
    if (client) {
      return client.works.findIndex((x) => x.id === value.id);
    }
    return -1;
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

  private sortWorks(value: IWork[]): IWork[] {
    return value.sort((a: IWork, b: IWork) => {
      var da = new Date(a.from!).getTime();
      var db = new Date(b.from!).getTime();

      return da < db ? -1 : da > db ? 1 : 0;
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
}
