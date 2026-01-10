/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  Filter,
  IClient,
  IClientAttribute,
} from 'src/app/domain/models/client-class';
import {
  ILoadable,
  IResettable,
  ISaveable,
} from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { ClientListService } from './client-list.service';
import { ClientEditService } from './client-edit.service';
import { ClientConfigService } from './client-config.service';
import { ClientSearchService } from './client-search.service';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import { DateToString } from 'src/app/shared/helpers/date.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { AddressService } from './address.service';
import { CommunicationService } from './communication.service';
import { ClientContractService } from './client-contract.service';
import { ClientGroupItemService } from './client-group-item.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  public clientContractService = inject(ClientContractService);
  public clientGroupItemService = inject(ClientGroupItemService);
  private dataClientService = inject(DataClientService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();

  public currentFilter: Filter = new Filter();
  public lastChangeFilter: Filter = new Filter();
  public clientAttribute: IClientAttribute[] = [];

  public onSaveCompleted?: () => void;
  public onExternalFilterChange?: () => void;
  public restoreSearch = signal('');
  public startToReadPage = signal(false);
  public returnUrl: string | null = null;

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
  public readonly isRead = this.clientEditService.isRead;
  public readonly isReset = this.clientEditService.isReset;
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
  public readonly hasRootGroups = computed(() =>
    this.clientConfigService.hasRootGroups()
  );

  public editClientDeleted = signal(false);
  public lastCountries = signal<any[]>([]);
  public filteredStateList = signal<any[]>([]);
  public editClientLastMutation = signal('');

  private _showProgressSpinner = computed(
    () =>
      this.clientListService.showProgressSpinner ||
      this.clientEditService.showProgressSpinner
  );
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public initIsRead = this.clientConfigService.isInit;

  constructor() {
    this.registry.register(
      RouteName.CLIENT,
      DataManagementClientService
    );
    this.registry.register(
      RouteName.EDIT_ADDRESS,
      DataManagementClientService
    );

    this.clientEditService.onSaveCompleted = () => {
      this.readPage();
      this.onSaveCompleted?.();
    };

    effect(() => {
      const isInit = this.clientConfigService.isInit();
      const shouldReadPage = this.startToReadPage();

      if (isInit) {
        untracked(() => {
          this.currentFilter.countries = this.clientConfigService.countries();
          this.currentFilter.list = this.clientConfigService.stateList();
          this.currentFilter.filteredStateToken =
            this.clientConfigService.stateList();
          this.currentFilter.countriesHaveBeenReadIn = true;

          if (shouldReadPage) {
            this.clientListService.readPage(this.currentFilter, this.clientAttribute);
          }
        });
      }
    });
  }

  public readPage = (isSecondRead = false) => {
    if (!isSecondRead) this.startToReadPage.set(true);
    if (this.clientConfigService.isInit()) {
      this.clientListService.readPage(this.currentFilter, this.clientAttribute);
    } else {
      this.clientConfigService.init();
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
    if (this.editClient()) {
      this.clientSearchService.saveBackup(
        this.editClient(),
        this.clientEditService.editClientDummy,
        this.findClient()
      );
    }
    this.readClient(id);
  };

  public resetFindClient = () => {
    const result = this.clientSearchService.restoreBackup();
    this.clientEditService.editClient.set(result.editClient ?? undefined);
    this.clientEditService.editClientDummy = result.editClientDummy;
    this.clientSearchService.findClient.set(result.findClient);
  };

  public addPhone = () => {
    if (this.editClient()) {
      this.communicationService.addPhone(this.editClient()!);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update((client) => ({ ...client! }));
    }
  };
  public delPhone = (index: number) => {
    if (this.editClient()) {
      this.communicationService.delPhone(this.editClient()!, index);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update((client) => ({ ...client! }));
    }
  };
  public addEmail = () => {
    if (this.editClient()) {
      this.communicationService.addEmail(this.editClient()!);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update((client) => ({ ...client! }));
    }
  };
  public delEmail = (index: number) => {
    if (this.editClient()) {
      this.communicationService.delEmail(this.editClient()!, index);
      this.communicationService.setCommunication(this.editClient()!);
      this.clientEditService.editClient.update((client) => ({ ...client! }));
    }
  };

  public addContract = () => {
    if (this.editClient()) {
      this.clientContractService.addContract(this.editClient()!);
      this.clientEditService.editClient.update((client) => ({ ...client! }));
    }
  };

  public addGroup = () => {
    if (this.editClient()) {
      this.clientGroupItemService.addGroup(this.editClient()!);
      this.clientEditService.editClient.update((client) => ({ ...client! }));
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
      this.filteredStateList.set(filteredStates);

      if (address.state && filteredStates.length > 0) {
        const stateExists = filteredStates.some(s => s.state === address.state);
        if (!stateExists) {
          address.state = '';
        }
      }
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

  save(): void {
    this.clientEditService.saveEditClient();
  }

  areObjectsDirty(): boolean {
    return this.clientEditService.isDirty();
  }

  canSave(): boolean {
    return this.clientEditService.canSave();
  }

  resetData(): void {
    this.clientEditService.resetData();
  }

  goBack(): string {
    if (this.returnUrl) {
      return this.returnUrl;
    }
    return '/workplace/client';
  }

  readChangeList(locale: string = DomainMessages.DEFAULT_LANG) {
    this.dataClientService
      .readChangeList(this.lastChangeFilter)
      .pipe(takeUntil(this.destroy$))
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

  getLastChangeMetaData(locale: string = DomainMessages.DEFAULT_LANG) {
    this.dataClientService.getLastChangeMetaData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        this.subTitleLastChangesAllAddress.set(
          `${DomainMessages.LAST_STATE} ${DateToString(
            x.lastChangesDate,
            locale
          )}${DomainMessages.EDITED_FROM} ${x.autor}`
        );
      });
  }

  showExternalClient(id: string) {
    this.clientEditService.readClient(id);
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
