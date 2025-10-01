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
import { ClientConfigService } from './client-config.service';

@Injectable({
  providedIn: 'root',
})
export class ClientEditService {
  private dataClientService = inject(DataClientService);
  private navigationService = inject(NavigationService);
  private addressService = inject(AddressService);
  private communicationService = inject(CommunicationService);
  private clientConfigService = inject(ClientConfigService);

  public editClient = signal<IClient | undefined>(undefined);
  public editClientDummy: IClient | undefined;

  public showProgressSpinner = signal(false);
  public onSaveCompleted?: () => void;

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

    const clientToSave = this.editClient()!;
    const apiCall = clientToSave.id
      ? this.dataClientService.updateClient(clientToSave)
      : this.dataClientService.addClient(clientToSave);

    apiCall.subscribe({
      next: (x) => {
        this.prepareClient(x, withoutUpdateDummy);
        this.onSaveCompleted?.();
      },
      error: (error) => {
        console.error('Error saving client:', error);
        this.onSaveCompleted?.();
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
