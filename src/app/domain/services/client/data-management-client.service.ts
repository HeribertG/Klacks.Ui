/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  Filter,
  IClient,
  IClientAttribute,
} from 'src/app/domain/models/client-class';
import {
  ILoadable,
  IResettable,
  ISaveable,
} from 'src/app/presentation/workplace/core/interfaces/common.interfaces';
import { ManageableServiceRegistry } from 'src/app/presentation/workplace/core/manageable-service-registry';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { ClientListService } from './client-list.service';
import { ClientEditService } from './client-edit.service';
import { ClientConfigService } from './client-config.service';
import { ClientSearchService } from './client-search.service';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import { DateToString } from 'src/app/domain/helpers/format-helper';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { AddressService } from './address.service';
import { CommunicationService } from './communication.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementClientService
  implements ISaveable, IResettable, ILoadable
{
  public clientListService = inject(ClientListService);
  public clientEditService = inject(ClientEditService);
  public clientConfigService = inject(ClientConfigService);
  public clientSearchService = inject(ClientSearchService);
  public addressService = inject(AddressService);
  public communicationService = inject(CommunicationService);
  private dataClientService = inject(DataClientService);
  private navigationService = inject(NavigationService);

  public currentFilter: Filter = new Filter();
  public lastChangeFilter: Filter = new Filter();
  public clientAttribute: IClientAttribute[] = [];

  public onSaveCompleted?: () => void;
  public onExternalFilterChange?: () => void;
  public restoreSearch = signal('');
  public startToReadPage = signal(false);

  public lastChangeListWrapper = signal<any>(undefined);
  public subTitleLastChanges = signal('');
  public lastChangeMaxItems = signal<number | undefined>(undefined);
  public subTitleLastChangesAllAddress = signal('');

  public readonly listWrapper = this.clientListService.listWrapper;
  public readonly paginationDataService =
    this.clientListService.paginationDataService;
  public readonly headerCheckBoxValue =
    this.clientListService.headerCheckBoxValue;
  public readonly editClient = this.clientEditService.editClient;
  public readonly currentAddressIndex =
    this.clientEditService.currentAddressIndex;
  public readonly currentAnnotationIndex =
    this.clientEditService.currentAnnotationIndex;
  public readonly findClient = this.clientSearchService.findClient;
  public readonly sortedFindClient = this.clientSearchService.sortedFindClient;
  public readonly findClientCount = this.clientSearchService.findClientCount;
  public readonly findClientPage = this.clientSearchService.findClientPage;
  public readonly findClientMaxPages =
    this.clientSearchService.findClientMaxPages;
  public readonly findClientMaxVisiblePage =
    this.clientSearchService.findClientMaxVisiblePage;
  public readonly communicationPhoneList = computed(
    () => this.editClient()?.communications.filter((c) => c.isPhone) || []
  );
  public readonly communicationEmailList = computed(
    () => this.editClient()?.communications.filter((c) => c.isEmail) || []
  );
  public readonly stateList = this.clientConfigService.stateList;
  public readonly communicationPrefixList =
    this.clientConfigService.communicationPrefixList;
  public readonly communicationTypePhoneList =
    this.clientConfigService.communicationTypePhoneList;
  public readonly communicationTypeEmailList =
    this.clientConfigService.communicationTypeEmailList;

  public editClientDeleted = signal(false);
  public lastCountries = signal<any[]>([]);
  public editClientLastMutation = signal('');

  public showProgressSpinner = computed(
    () =>
      this.clientListService.showProgressSpinner() ||
      this.clientEditService.showProgressSpinner()
  );
  public isReset = signal(false);
  public isRead = signal(false);
  public initIsRead = this.clientConfigService.isInit;

  constructor() {
    ManageableServiceRegistry.register(
      RouteName.CLIENT,
      DataManagementClientService
    );
    ManageableServiceRegistry.register(
      RouteName.EDIT_ADDRESS,
      DataManagementClientService
    );

    this.clientEditService.onSaveCompleted = () => {
      this.readPage();
      this.onSaveCompleted?.();
    };

    effect(() => {
      if (this.clientConfigService.isInit()) {
        this.currentFilter.countries = this.clientConfigService.countries();
        this.currentFilter.list = this.clientConfigService.stateList();
        this.currentFilter.filteredStateToken =
          this.clientConfigService.stateList();
        this.currentFilter.countriesHaveBeenReadIn = true;
      }
    });
  }

  public readPage = (isSecondRead = false) => {
    if (!isSecondRead) this.startToReadPage.set(true);
    if (this.clientConfigService.isInit()) {
      this.clientListService.readPage(this.currentFilter, this.clientAttribute);
    }
  };
  public deleteClient = (key: string) =>
    this.clientListService.deleteClient(key);
  public exportExcel = (type = 0) =>
    this.clientListService.exportExcel(this.currentFilter);
  public clearCheckedArray = () => this.clientListService.clearCheckedArray();
  public addCheckBoxValueToArray = (value: any) =>
    this.clientListService.addCheckBoxValueToArray(value);
  public findCheckBoxValue = (key: string) =>
    this.clientListService.findCheckBoxValue(key);
  public removeCheckBoxValueToArray = (key: string) =>
    this.clientListService.removeCheckBoxValueToArray(key);
  public checkBoxIndeterminate = () =>
    this.clientListService.checkBoxIndeterminate();

  public createClient = () => this.clientEditService.createClient();
  public readClient = (id: string) => this.clientEditService.readClient(id);
  public refreshClientState = () => this.clientEditService.refreshClientState();
  public addAnnotation = () => this.clientEditService.addAnnotation();
  public removeCurrentAnnotation = () =>
    this.clientEditService.removeCurrentAnnotation();
  public readClientAddressListWithoutQueryFilter = () =>
    this.clientEditService.readClientAddressListWithoutQueryFilter();

  public findClients = () => {
    if (this.editClient()) {
      this.clientSearchService.findClients(this.editClient()!);
    }
  };
  public readActualSortedClientPage = () =>
    this.clientSearchService.readActualSortedClientPage();
  public replaceClient = (id: string) => {
    this.readClient(id);
  };
  public resetFindClient = () => {};

  public addPhone = () => {
    if (this.editClient()) {
      this.communicationService.addPhone(this.editClient()!);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update(client => ({...client!}));
    }
  };
  public delPhone = (index: number) => {
    if (this.editClient()) {
      this.communicationService.delPhone(this.editClient()!, index);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update(client => ({...client!}));
    }
  };
  public addEmail = () => {
    if (this.editClient()) {
      this.communicationService.addEmail(this.editClient()!);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update(client => ({...client!}));
    }
  };
  public delEmail = (index: number) => {
    if (this.editClient()) {
      this.communicationService.delEmail(this.editClient()!, index);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update(client => ({...client!}));
    }
  };

  public removeCurrentAddress = () => {
    if (this.editClient()) {
      const updatedClient = this.addressService.removeCurrentAddress(
        this.editClient()!,
        this.currentAddressIndex()
      );
      this.clientEditService.editClient.set(updatedClient);
    }
  };

  public writeCity = async () => {
    if (this.editClient()) {
      const address = this.editClient()!.addresses[this.currentAddressIndex()];
      const {
        address: newAddress,
        lastCountries,
        stateList,
      } = await this.addressService.writeCity(address, this.stateList());
      this.lastCountries.set(lastCountries);
    }
  };

  public filterState = () => {
    if (this.editClient()) {
      const address = this.editClient()!.addresses[this.currentAddressIndex()];
      const filteredStates = this.addressService.filterState(
        address,
        this.clientConfigService.stateList()
      );
      console.log(filteredStates);
    }
  };

  public isCurrentAddressMainAddress = () => {
    if (this.editClient()) {
      return this.addressService.isCurrentAddressMainAddress(
        this.editClient()!,
        this.currentAddressIndex()
      );
    }
    return false;
  };

  public reReadAddress = () => {
    if (this.editClient()) {
      const { editClient, currentAddressIndex } =
        this.addressService.setAddress(
          this.editClient()!,
          this.currentAddressIndex()
        );
      this.clientEditService.editClient.set(editClient);
      this.clientEditService.currentAddressIndex.set(currentAddressIndex);
    }
  };

  init() {}

  save(): void {
    this.clientEditService.saveEditClient();
  }

  areObjectsDirty(): boolean {
    return this.clientEditService.isDirty();
  }

  resetData(): void {
    this.clientEditService.resetData();
  }

  goBack(): string {
    return '/workplace/client';
  }

  readChangeList(locale: string = MessageLibrary.DEFAULT_LANG) {
    this.dataClientService
      .readChangeList(this.lastChangeFilter)
      .subscribe((x) => {
        x.clients.forEach((z: IClient) => {
          const res = this.clientAttribute.find((y) => +y.type === +z.type);
          if (res) {
            z.typeAbbreviation = res.name.substring(0, 1);
          }
        });

        this.lastChangeListWrapper.set(x);
        this.subTitleLastChanges.set(
          `${DateToString(x.lastChange, locale)}, bearbeitet von ${x.editor}`
        );
        this.lastChangeMaxItems.set(x.maxItems);
      });
  }

  getLastChangeMetaData(locale: string = MessageLibrary.DEFAULT_LANG) {
    this.dataClientService.getLastChangeMetaData().subscribe((x) => {
      this.subTitleLastChangesAllAddress.set(
        `${MessageLibrary.LAST_STATE} ${DateToString(
          x.lastChangesDate,
          locale
        )}${MessageLibrary.EDITED_FROM} ${x.autor}`
      );
    });
  }

  showExternalClient(id: string) {
    this.clientEditService.readClient(id);
    this.navigationService.navigateToEditAddress(id);
  }
}
