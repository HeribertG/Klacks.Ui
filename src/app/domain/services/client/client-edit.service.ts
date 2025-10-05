import { inject, Injectable, signal } from '@angular/core';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import {
  IClient,
  IAddress,
  Client,
  Membership,
  Annotation,
} from 'src/app/domain/models/client-class';
import { cloneObject } from 'src/app/domain/helpers/object-helpers';
import {
  transformDateToNgbDateStruct,
} from 'src/app/domain/helpers/format-helper';
import { AddressTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AddressService } from './address.service';
import { CommunicationService } from './communication.service';
import { ClientContractService } from './client-contract.service';
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

    const { editClient, currentAddressIndex } = this.addressService.setAddress(this.editClient()!, -1);
    this.editClient.set(editClient);
    this.currentAddressIndex.set(currentAddressIndex);

    this.communicationService.setCommunication(this.editClient()!);

    if (!withoutUpdateDummy) {
      this.editClientDummy = cloneObject<IClient>(this.editClient()!);
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

    const { editClient, currentAddressIndex } = this.addressService.setAddress(this.editClient()!, -1);
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
    if (!this.isDirty()) return;

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
            const translatedMessages = errorKeys.map(key => {
              const translated = this.translateService.instant(key);
              return translated !== key ? translated : key;
            });
            errorMessage = translatedMessages.join('. ');
          }
        } else if (error?.error?.detail) {
          const translated = this.translateService.instant(error.error.detail);
          errorMessage = translated !== error.error.detail ? translated : error.error.detail;
        } else if (error?.error?.title) {
          const translated = this.translateService.instant(error.error.title);
          errorMessage = translated !== error.error.title ? translated : error.error.title;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.lastSaveErrorMessage.set(errorMessage);
        this.toastShowService.showError(errorMessage, 'client-save-error');
      },
    });
  }

  public addAnnotation() {
    this.editClient.update(client => {
      if (!client!.annotations) {
        client!.annotations = [];
      }
      client!.annotations.push(new Annotation());
      return client;
    });
  }

  public removeCurrentAnnotation() {
    this.editClient.update(client => {
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
    this.editClient.update(client => {
        client!.internalBirthdate = transformDateToNgbDateStruct(
            client!.birthdate!
        );
        client!.membership!.internalValidFrom =
            transformDateToNgbDateStruct(client!.membership!.validFrom);
        client!.membership!.internalValidUntil =
            transformDateToNgbDateStruct(client!.membership!.validUntil!);

        this.clientContractService.setDateStructs(client!.clientContracts);

        return client;
    });
  }

  public isDirty(): boolean {
    if (!this.editClient() || !this.editClientDummy) {
        return false;
    }
    // This is a simplified dirty check. The original used a complex object comparison.
    // A more robust implementation might be needed.
    const isDirty = JSON.stringify(this.editClient()) !== JSON.stringify(this.editClientDummy);
    return isDirty && this.isDirtyClientValid();
  }

  private isDirtyClientValid(): boolean {
    const client = this.editClient();
    if (
      client?.gender === GenderEnum.legalEntity &&
      !client?.company
    ) {
      return false;
    }
    return true;
  }

  public resetData(): void {
    if (this.editClientDummy) {
        this.prepareClient(cloneObject<IClient>(this.editClientDummy)!);
    }
  }
}
