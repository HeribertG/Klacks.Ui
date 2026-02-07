/* eslint-disable @typescript-eslint/no-unused-vars */
import { inject, Injectable, signal } from '@angular/core';
import { IClient } from 'src/app/domain/models/client/client-class';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ClientSearchService {
  private dataClientService = inject(DataClientService);
  private destroy$ = new Subject<void>();

  public findClient = signal<IClient[]>([]);
  public sortedFindClient = signal<IClient[]>([]);
  public findClientCount = signal(0);
  public findClientPage = signal(0);
  public findClientMaxVisiblePage = 5;
  public findClientMaxPages = signal(1);

  private backupFindClient: IClient | undefined;
  private backupFindClientDummy: IClient | undefined;
  private backupFindClientList: IClient[] = [];

  public findClients(editClient: IClient) {
    if (!editClient.id) {
      let company = editClient.company ?? '';
      let name = editClient.name ?? '';
      let firstName = editClient.firstName ?? '';

      if (company || name || firstName) {
        company += ' ';
        name += ' ';
        firstName += ' ';

        this.dataClientService
          .findClient(company, name, firstName)
          .pipe(takeUntil(this.destroy$))
          .subscribe((x) => {
            this.doSortFindClient(x);
          });
      } else {
        this.resetFindList();
        this.resetFindListBackup();
      }
    }
  }

  private resetFindListBackup() {
    this.backupFindClient = undefined;
    this.backupFindClientDummy = undefined;
    this.backupFindClientList = new Array<IClient>();
  }

  private resetFindList() {
    this.findClient.set([]);
    this.findClientCount.set(0);
    this.sortedFindClient.set([]);
    this.findClientPage.set(0);
  }

  private doSortFindClient(lst: IClient[]) {
    this.findClientCount.set(lst.length);
    this.findClientMaxPages.set(
      Math.ceil(this.findClientCount() / this.findClientMaxVisiblePage)
    );
    this.findClient.set(lst);

    if (this.findClientCount() <= this.findClientMaxVisiblePage) {
      this.sortedFindClient.set(lst);
      this.findClientPage.set(0);
    } else {
      this.sortedFindClient.set(lst);
      this.findClientPage.set(1);
      this.readActualSortedClientPage();
    }
  }

  public readActualSortedClientPage() {
    const currPage =
      this.findClientPage() - 1 < 0 ? 0 : this.findClientPage() - 1;
    const startItem = currPage * this.findClientMaxVisiblePage;
    const endItem = startItem + this.findClientMaxVisiblePage;
    this.sortedFindClient.set(this.findClient().slice(startItem, endItem));
  }

  public replaceClient(
    editClient: IClient,
    editClientDummy: IClient,
    findClientList: IClient[],
    id: string
  ): {
    backupFindClient: IClient | undefined;
    backupFindClientDummy: IClient | undefined;
    backupFindClientList: IClient[] | undefined;
  } {
    const backupFindClient = cloneObject(editClient);
    const backupFindClientDummy = cloneObject<IClient | undefined>(
      editClientDummy
    );
    const backupFindClientList = cloneObject<IClient[]>(findClientList);

    return { backupFindClient, backupFindClientDummy, backupFindClientList };
  }

  public resetFindClient(
    backupFindClient: IClient | undefined,
    backupFindClientDummy: IClient | undefined,
    backupFindClientList: IClient[] | undefined
  ): {
    editClient: IClient | undefined;
    editClientDummy: IClient | undefined;
    findClient: IClient[] | undefined;
  } {
    const editClient = cloneObject<IClient | undefined>(backupFindClient);
    const editClientDummy = cloneObject<IClient | undefined>(
      backupFindClientDummy
    );
    const findClient = cloneObject<IClient[]>(backupFindClientList || []);

    this.resetFindListBackup();
    return { editClient, editClientDummy, findClient };
  }

  public isResetPossible(): boolean {
    return this.backupFindClient !== undefined;
  }

  public saveBackup(
    editClient: IClient | undefined,
    editClientDummy: IClient | undefined,
    findClientList: IClient[]
  ): void {
    this.backupFindClient = cloneObject(editClient);
    this.backupFindClientDummy = cloneObject(editClientDummy);
    this.backupFindClientList = cloneObject(findClientList);
  }

  public restoreBackup(): {
    editClient: IClient | undefined;
    editClientDummy: IClient | undefined;
    findClient: IClient[];
  } {
    const result = this.resetFindClient(
      this.backupFindClient,
      this.backupFindClientDummy,
      this.backupFindClientList
    );
    return {
      editClient: result.editClient,
      editClientDummy: result.editClientDummy,
      findClient: result.findClient ?? []
    };
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
