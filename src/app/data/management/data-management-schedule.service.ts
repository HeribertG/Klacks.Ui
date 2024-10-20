import { Injectable, signal } from '@angular/core';
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
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService {
  public isRead = new Subject<boolean>();
  public isUpdate = new Subject<IWork>(); //Zeichnet die selektierte Zeile neu
  public showProgressSpinner = signal(false);

  workFilter: IWorkFilter = new WorkFilter();
  clients: IClientWork[] = [];
  private workFilterDummy: IWorkFilter | undefined = undefined;

  constructor(
    public toastService: ToastService,
    private dataSchedule: DataScheduleService
  ) {}

  readDatas() {
    this.showProgressSpinner.set(true);
    this.dataSchedule.getClientList(this.workFilter).subscribe((x) => {
      this.clients = x;
      this.workFilterDummy = cloneObject(this.workFilter);
      this.isRead.next(true);
      this.showProgressSpinner.set(false);
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
        this.isUpdate.next(x);
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

  async updateWork(index: number, value: IWork) {
    return this.dataSchedule.updateWork(value as Work).subscribe(() => {
      const client = this.clients[index];
      client.works = this.sortWorks(client.works);
      this.isUpdate.next(value);
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
