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
import { ManageableServiceRegistry } from 'src/app/application/services/manageable-service-registry';
import { RouteName } from '../../models/entity-names.enum';
import { EVENT_BUS_TOKEN, IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
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
  private destroy$ = new Subject<void>();

  public isRead = signal(false);
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public isUpdate = signal<IBreak | undefined>(undefined);
  public isAbsenceHeaderInit = signal(false);

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

  // only when DataManagementAbsenceGanttService has loaded its AbsenceFilter,
  // can be read. The AbsenceFilter is integrated in the breakFilter.
  canReadBreaks = false;

  constructor() {
    ManageableServiceRegistry.register(
      RouteName.ABSENCE,
      DataManagementBreakService
    );
  }

  reRead() {
    this.readYear();
  }

  readYear() {
    this._showProgressSpinner.set(true);
    if (this.canReadBreaks) {
      this.clients = [];

      this.dataBreakService.getClientList(this.breakFilter).pipe(takeUntil(this.destroy$)).subscribe({
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
          this._showProgressSpinner.set(false);
          this.isRead.set(true);

          setTimeout(() => this.isRead.set(false), 100);
        },
        error: (err) => {
          console.error('Error loading the breaks:', err);
          this._showProgressSpinner.set(false);
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
      this.dataBreakService.addBreak(tmp).pipe(takeUntil(this.destroy$)).subscribe((x: IBreak) => {
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
      this.dataBreakService.deleteBreak(value.id!).pipe(takeUntil(this.destroy$)).subscribe(() => {
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
    const client = this.clients[index];

    if (!this.validateBreakDatesAgainstMembership(client, value)) {
      return;
    }

    return this.dataBreakService.updateBreak(value as Break).pipe(takeUntil(this.destroy$)).subscribe(() => {
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
            context: 'DataManagementBreakService.validateBreakDatesAgainstMembership'
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
            context: 'DataManagementBreakService.validateBreakDatesAgainstMembership'
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
            context: 'DataManagementBreakService.validateBreakDatesAgainstMembership'
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
