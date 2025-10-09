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
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/domain/helpers/format-helper';
import { AddressTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AddressService } from './address.service';
import { CommunicationService } from './communication.service';
import { ClientContractService } from './client-contract.service';
import { ClientGroupItemService } from './client-group-item.service';
import { ClientConfigService } from './client-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class ClientEditService {
  private dataClientService = inject(DataClientService);
  private navigationService = inject(NavigationService);
  private addressService = inject(AddressService);
  private communicationService = inject(CommunicationService);
  private clientContractService = inject(ClientContractService);
  private clientGroupItemService = inject(ClientGroupItemService);
  private clientConfigService = inject(ClientConfigService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  public editClient = signal<IClient | undefined>(undefined);
  public editClientDummy: IClient | undefined;

  public showProgressSpinner = signal(false);
  public onSaveCompleted?: () => void;
  public lastSaveError = signal<boolean>(false);
  public lastSaveErrorMessage = signal<string>('');

  public currentAddressIndex = signal(-1);
  public currentAnnotationIndex = signal(-1);
  public clientAddressListWithoutQueryFilter = signal<IAddress[]>([]);

  private prepareClient(value: IClient, withoutUpdateDummy = false) {
    if (value == null) {
      return;
    }

    this.editClient.set(value);
    this.setDateStruc();

    const { editClient, currentAddressIndex } = this.addressService.setAddress(
      this.editClient()!,
      -1
    );
    this.editClient.set(editClient);
    this.currentAddressIndex.set(currentAddressIndex);

    this.communicationService.setCommunication(this.editClient()!);

    if (!withoutUpdateDummy) {
      setTimeout(() => {
        this.editClientDummy = cloneObject<IClient>(this.editClient()!);
      }, 0);
    }

    if (this.editClient()!.id) {
      setTimeout(() => history.pushState(null, '', this.createUrl()), 100);
    }

    this.showProgressSpinner.set(false);
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
      this.showProgressSpinner.set(true);
      this.dataClientService.getClient(id).subscribe((x) => {
        this.prepareClient(x);
        this.navigationService.navigateToEditAddress(id);
      });
    }
  }

  public createClient() {
    this.showProgressSpinner.set(true);
    this.dataClientService.countIdNumber().subscribe((x) => {
      const c = new Client();
      c.membership = new Membership();
      c.membership.validFrom = new Date();
      c.idNumber = x + 1;
      const a = c.addresses[0];
      a.validFrom = new Date();
      a.type = AddressTypeEnum.customer;

      this.prepareClient(c);
      this.navigationService.navigateToEditAddress();
      this.showProgressSpinner.set(false);
    });
  }

  public saveEditClient(withoutUpdateDummy = false) {
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

    apiCall.subscribe({
      next: (x) => {
        this.lastSaveError.set(false);
        this.lastSaveErrorMessage.set('');
        this.prepareClient(x, withoutUpdateDummy);
        this.onSaveCompleted?.();
      },
      error: (error) => {
        console.error('Error saving client:', error);
        this.lastSaveError.set(true);
        this.showProgressSpinner.set(false);

        let errorMessage = 'Fehler beim Speichern';
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
        this.toastShowService.showError(errorMessage, 'client-save-error');
      },
    });
  }

  public addAnnotation() {
    this.editClient.update((client) => {
      if (!client!.annotations) {
        client!.annotations = [];
      }
      client!.annotations.push(new Annotation());
      return client;
    });
  }

  public removeCurrentAnnotation() {
    this.editClient.update((client) => {
      if (client!.annotations) {
        client!.annotations.splice(this.currentAnnotationIndex(), 1);
      }
      return client;
    });
  }

  public readClientAddressListWithoutQueryFilter() {
    if (this.editClient()?.id) {
      this.dataClientService
        .readClientAddressList(this.editClient()!.id!)
        .subscribe((x) => {
          this.clientAddressListWithoutQueryFilter.set(x);
        });
    }
  }

  private setDateStruc() {
    this.editClient.update((client) => {
      client!.internalBirthdate = transformDateToNgbDateStruct(
        client!.birthdate!
      );
      client!.membership!.internalValidFrom = transformDateToNgbDateStruct(
        client!.membership!.validFrom
      );
      client!.membership!.internalValidUntil = transformDateToNgbDateStruct(
        client!.membership!.validUntil!
      );

      this.clientContractService.setDateStructs(client!.clientContracts);
      this.clientGroupItemService.setDateStructs(client!.groupItems);

      return client;
    });
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

    if (!this.isValidContracts(client)) {
      return false;
    }

    return this.isValidGroupItems(client);
  }

  private isValidContracts(client: IClient): boolean {
    if (!client.clientContracts || client.clientContracts.length === 0) {
      return true;
    }

    const hasActiveContract = client.clientContracts.some((c) => c.isActive);
    if (!hasActiveContract) {
      return false;
    }

    const allDatesValid = client.clientContracts.every((c) => {
      if (!c.internalUntilDate) {
        return true;
      }

      const fromDate = transformNgbDateStructToDate(c.internalFromDate);
      const untilDate = transformNgbDateStructToDate(c.internalUntilDate);

      if (!fromDate || !untilDate) {
        return false;
      }

      return fromDate <= untilDate;
    });

    return allDatesValid;
  }

  private isValidGroupItems(client: IClient): boolean {
    if (!client.groupItems || client.groupItems.length === 0) {
      return true;
    }

    const allDatesValid = client.groupItems.every((g) => {
      if (!g.internalValidUntil) {
        return true;
      }

      const validFrom = transformNgbDateStructToDate(g.internalValidFrom);
      const validUntil = transformNgbDateStructToDate(g.internalValidUntil);

      if (!validFrom || !validUntil) {
        return false;
      }

      return validFrom < validUntil;
    });

    return allDatesValid;
  }

  public resetData(): void {
    if (this.editClientDummy) {
      this.prepareClient(cloneObject<IClient>(this.editClientDummy)!);
    }
  }
}
