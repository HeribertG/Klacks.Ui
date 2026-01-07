/* eslint-disable @typescript-eslint/no-unused-vars */
import { inject, Injectable, signal } from '@angular/core';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import {
  IClient,
  IAddress,
  Client,
  Membership,
  Annotation,
} from 'src/app/domain/models/client-class';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { AddressTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { AddressService } from './address.service';
import { CommunicationService } from './communication.service';
import { ClientContractService } from './client-contract.service';
import { ClientGroupItemService } from './client-group-item.service';
import { ClientConfigService } from './client-config.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ClientEditService {
  private dataClientService = inject(DataClientService);
  private addressService = inject(AddressService);
  private communicationService = inject(CommunicationService);
  private clientContractService = inject(ClientContractService);
  private clientGroupItemService = inject(ClientGroupItemService);
  public clientConfigService = inject(ClientConfigService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private translateService = inject(TranslateService);
  private destroy$ = new Subject<void>();

  public editClient = signal<IClient | undefined>(undefined);
  public editClientDummy: IClient | undefined;
  public isRead = signal(false);
  public isReset = signal(false);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }
  public onSaveCompleted?: () => void;
  public lastSaveError = signal<boolean>(false);
  public lastSaveErrorMessage = signal<string>('');

  public currentAddressIndex = signal(-1);
  public currentAnnotationIndex = signal(-1);
  public clientAddressListWithoutQueryFilter = signal<IAddress[]>([]);

  private prepareClient(value: IClient) {
    if (value == null) {
      return;
    }

    this.editClient.set(value);

    const { editClient, currentAddressIndex } = this.addressService.setAddress(
      this.editClient()!,
      -1
    );

    this.editClient.set(editClient);
    this.currentAddressIndex.set(currentAddressIndex);
    this.communicationService.setCommunication(this.editClient()!);
    this.editClientDummy = cloneObject<IClient>(this.editClient()!);

    if (this.editClient()!.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }

    this._showProgressSpinner.set(false);
    this.isRead.set(true);
  }

  public refreshClientState() {
    if (this.editClient() == null) {
      return;
    }

    const { editClient, currentAddressIndex } = this.addressService.setAddress(
      this.editClient()!,
      -1
    );

    this.editClient.set(editClient);
    this.currentAddressIndex.set(currentAddressIndex);

    this.communicationService.setCommunication(this.editClient()!);
  }

  private createUrl(): string {
    return '/workplace/edit-address/' + this.editClient()!.id;
  }

  public readClient(id: string) {
    if (id !== '') {
      this._showProgressSpinner.set(true);
      this.isRead.set(false);
      this.dataClientService
        .getClient(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe((x) => {
          this.prepareClient(x);
        });
    }
  }

  public createClient() {
    this._showProgressSpinner.set(true);
    this.isRead.set(false);
    this.dataClientService
      .countIdNumber()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (x) => {
          const c = new Client();
          c.type = 0;
          c.membership = new Membership();
          c.membership.validFrom = new Date();
          c.idNumber = x + 1;
          const a = c.addresses[0];
          a.validFrom = new Date();
          a.type = AddressTypeEnum.customer;

          this.prepareClient(c);
          this._showProgressSpinner.set(false);
        },
        error: (err) => {
          this._showProgressSpinner.set(false);

          const c = new Client();
          c.type = 0;
          c.membership = new Membership();
          c.membership.validFrom = new Date();
          c.idNumber = 1;
          const a = c.addresses[0];
          a.validFrom = new Date();
          a.type = AddressTypeEnum.customer;

          this.prepareClient(c);
        }
      });
  }

  public saveEditClient() {
    if (!this.canSave()) return;

    const filteredContracts = this.editClient()!.clientContracts.filter(
      (contract) => contract.contractId && contract.contractId !== ''
    );

    const clientToSave: IClient = {
      ...this.editClient()!,
      clientContracts: filteredContracts,
    };

    const apiCall = clientToSave.id
      ? this.dataClientService.updateClient(clientToSave)
      : this.dataClientService.addClient(clientToSave);

    apiCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: (x) => {
        this.lastSaveError.set(false);
        this.lastSaveErrorMessage.set('');

        if (x.id) {
          this.dataClientService
            .getClient(x.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe((refreshedClient) => {
              this.prepareClient(refreshedClient);
              this.onSaveCompleted?.();
            });
        }
      },
      error: (error) => {
        console.error('Error saving client:', error);
        this.lastSaveError.set(true);
        this._showProgressSpinner.set(false);

        let errorMessage = 'Error while saving';
        const errorKeys: string[] = [];

        if (error?.error?.errors) {
          const errors = error.error.errors;

          for (const [field, messages] of Object.entries(errors)) {
            if (Array.isArray(messages)) {
              errorKeys.push(...messages);
            }
          }

          if (errorKeys.length > 0) {
            const translatedMessages = errorKeys.map((key) => {
              const translated = this.translateService.instant(key);
              return translated !== key ? translated : key;
            });
            errorMessage = translatedMessages.join('. ');
          }
        } else if (error?.error?.detail) {
          const translated = this.translateService.instant(error.error.detail);
          errorMessage =
            translated !== error.error.detail ? translated : error.error.detail;
        } else if (error?.error?.title) {
          const translated = this.translateService.instant(error.error.title);
          errorMessage =
            translated !== error.error.title ? translated : error.error.title;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.lastSaveErrorMessage.set(errorMessage);
        this.eventBus.emit(DomainEventType.ERROR, {
          message: errorMessage,
          code: 'client-save-error',
          context: 'ClientEditService.saveEditClient',
        });
      },
    });
  }

  public addAnnotation() {
    this.editClient.update((client) => {
      if (!client) return client;

      if (!client.annotations) {
        client.annotations = [];
      }
      client.annotations.unshift(new Annotation());

      return { ...client };
    });
  }

  public removeCurrentAnnotation() {
    this.editClient.update((client) => {
      if (!client || !client.annotations) return client;

      client.annotations.splice(this.currentAnnotationIndex(), 1);

      return { ...client };
    });
  }

  public readClientAddressListWithoutQueryFilter() {
    if (this.editClient()?.id) {
      this.dataClientService
        .readClientAddressList(this.editClient()!.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe((x) => {
          this.clientAddressListWithoutQueryFilter.set(x);
        });
    }
  }

  public isDirty(): boolean {
    const a = this.editClient();
    const b = this.editClientDummy;

    if (!a || !b) {
      return false;
    }

    return !compareComplexObjects(a, b);
  }

  public canSave(): boolean {
    return this.isDirty() && this.isValid();
  }

  public isValid(): boolean {
    const client = this.editClient();
    if (!client) {
      return false;
    }

    if (client.legalEntity) {
      return this.isValidLegalEntity(client);
    } else {
      return this.isValidNormalClient(client);
    }
  }

  private isValidLegalEntity(client: IClient): boolean {
    if (!client.company || client.company.trim() === '') {
      return false;
    }

    const hasValidAddress = client.addresses.some(
      (addr) =>
        addr.zip &&
        addr.zip.trim() !== '' &&
        addr.city &&
        addr.city.trim() !== '' &&
        addr.country &&
        addr.country.trim() !== ''
    );

    if (!hasValidAddress) {
      return false;
    }

    if (!this.isValidContracts(client)) {
      return false;
    }

    return this.isValidGroupItems(client);
  }

  private isValidNormalClient(client: IClient): boolean {
    if (!client.firstName || client.firstName.trim() === '') {
      return false;
    }

    if (!client.name || client.name.trim() === '') {
      return false;
    }

    if (
      client.gender !== GenderEnum.female &&
      client.gender !== GenderEnum.male &&
      client.gender !== GenderEnum.intersexuality
    ) {
      return false;
    }

    const hasValidAddress = client.addresses.some(
      (addr) =>
        addr.zip &&
        addr.zip.trim() !== '' &&
        addr.city &&
        addr.city.trim() !== '' &&
        addr.country &&
        addr.country.trim() !== ''
    );

    if (!hasValidAddress) {
      return false;
    }

    if (!this.isValidContracts(client)) {
      return false;
    }

    return this.isValidGroupItems(client);
  }

  private isValidContracts(client: IClient): boolean {
    if (!client.clientContracts || client.clientContracts.length === 0) {
      return true;
    }

    const validContracts = client.clientContracts.filter(
      (c) => c.contractId && c.contractId !== ''
    );

    if (validContracts.length === 0) {
      return true;
    }

    const hasActiveContract = validContracts.some((c) => c.isActive);
    if (!hasActiveContract) {
      return false;
    }

    const allDatesValid = validContracts.every((c) => {
      if (!c.untilDate) {
        return true;
      }

      const fromDate = c.fromDate ? new Date(c.fromDate) : null;
      const untilDate = c.untilDate ? new Date(c.untilDate) : null;

      if (!fromDate || !untilDate) {
        return false;
      }

      return fromDate <= untilDate;
    });

    return allDatesValid;
  }

  private isValidGroupItems(client: IClient): boolean {
    if (!this.clientConfigService.hasRootGroups()) {
      return true;
    }

    if (!client.groupItems || client.groupItems.length === 0) {
      return true;
    }

    const allDatesValid = client.groupItems.every((g) => {
      if (!g.validUntil) {
        return true;
      }

      const validFrom = g.validFrom ? new Date(g.validFrom) : null;
      const validUntil = g.validUntil ? new Date(g.validUntil) : null;

      if (!validFrom || !validUntil) {
        return false;
      }

      return validFrom < validUntil;
    });

    return allDatesValid;
  }

  public resetData(): void {
    if (this.editClientDummy) {
      this.isReset.set(true);
      this.prepareClient(cloneObject<IClient>(this.editClientDummy));
      setTimeout(() => this.isReset.set(false), 100);
    }
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
