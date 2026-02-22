// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  signal,
  WritableSignal,
  Signal,
  effect,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { IClientContract } from 'src/app/domain/models/client/client-class';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/shared/helpers/ngb-date.helper';

export interface ClientContractFormEntry {
  contract: IClientContract;
  fromDate: WritableSignal<NgbDateStruct | undefined>;
  untilDate: WritableSignal<NgbDateStruct | undefined>;
}

export class ClientContractFormModel {
  private _entries: WritableSignal<ClientContractFormEntry[]> = signal([]);
  public entries: Signal<ClientContractFormEntry[]> =
    this._entries.asReadonly();

  constructor(private injector: Injector) {}

  public initFromContracts(contracts: IClientContract[]): void {
    const entries = contracts.map((contract) => this.createEntry(contract));
    this._entries.set(entries);
  }

  private createEntry(contract: IClientContract): ClientContractFormEntry {
    const fromDate = signal<NgbDateStruct | undefined>(
      transformDateToNgbDateStruct(contract.fromDate)
    );
    const untilDate = signal<NgbDateStruct | undefined>(
      transformDateToNgbDateStruct(contract.untilDate)
    );

    runInInjectionContext(this.injector, () => {
      effect(() => {
        const from = fromDate();
        contract.fromDate = transformNgbDateStructToDate(from) || new Date();
      });

      effect(() => {
        const until = untilDate();
        contract.untilDate = transformNgbDateStructToDate(until) || undefined;
      });
    });

    return { contract, fromDate, untilDate };
  }

  public addContract(contract: IClientContract): void {
    const entry = this.createEntry(contract);
    this._entries.update((entries) => [...entries, entry]);
  }

  public removeContract(contract: IClientContract): void {
    this._entries.update((entries) =>
      entries.filter((e) => e.contract !== contract)
    );
  }

  public getEntryByContract(
    contract: IClientContract
  ): ClientContractFormEntry | undefined {
    return this._entries().find((e) => e.contract === contract);
  }

  public applyToContracts(): void {
    this._entries().forEach((entry) => {
      entry.contract.fromDate =
        transformNgbDateStructToDate(entry.fromDate()) || new Date();
      entry.contract.untilDate =
        transformNgbDateStructToDate(entry.untilDate()) || undefined;
    });
  }

  public isValid(): boolean {
    return this._entries().every((entry) => {
      if (!entry.untilDate()) {
        return true;
      }

      const from = transformNgbDateStructToDate(entry.fromDate());
      const until = transformNgbDateStructToDate(entry.untilDate());

      if (!from || !until) {
        return false;
      }

      return from <= until;
    });
  }
}
