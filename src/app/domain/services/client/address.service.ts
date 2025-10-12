import { inject, Injectable } from '@angular/core';
import {
  IClient,
  IAddress,
  Address,
  IPostCodeCH,
} from 'src/app/domain/models/client-class';
import { DataCountryStateService } from 'src/app/infrastructure/api/data-country-state.service';
import { EventBus } from 'src/app/application/services/event-bus.service';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { isNumeric } from 'src/app/domain/helpers/format-helper';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private dataCountryStateService = inject(DataCountryStateService);
  private eventBus = inject(EventBus);

  public maxAddressType = 3;

  public removeCurrentAddress(editClient: IClient, currentAddressIndex: number): IClient {
    editClient.addresses.splice(currentAddressIndex, 1);
    return this.setAddress(editClient, -1).editClient;
  }

  public writeCity(address: IAddress, countries: StateCountryToken[]): Promise<{
    address: IAddress;
    lastCountries: IPostCodeCH[];
    stateList: StateCountryToken[];
  }> {
    return new Promise((resolve, reject) => {
      let lastCountries: IPostCodeCH[] = [];
      let stateList: StateCountryToken[] = [];

      if (isNumeric(address.zip)) {
        this.dataCountryStateService
          .SearchCity(address.zip)
          .then((res) => {
            if (res!.length === 1) {
              address.city = res![0].city;
              address.state = res![0].state;
              address.country = 'CH';
            } else if (res!.length > 1) {
              address.city = '';
              lastCountries = res!;
              address.state = res![0].state;
              address.country = 'CH';
            }
            stateList = this.filterState(address, countries);
            resolve({ address, lastCountries, stateList });
          })
          .catch(() => {
            this.eventBus.emit(DomainEventType.INFO, {
              message: MessageLibrary.ZIP_NOT_VALID,
              context: 'AddressService.writeCity'
            });
            reject();
          });
      } else {
        let leftCharacters = address.zip.substring(0, 2);
        leftCharacters = leftCharacters.replace('-', ' ');

        const countryAbbreviation = leftCharacters.toUpperCase().trim();
        const foundCountry = countries.find(
          (x) => x.country === countryAbbreviation
        );

        if (foundCountry) {
          address.country = countryAbbreviation;
        }

        stateList = this.filterState(address, countries);
        resolve({ address, lastCountries, stateList });
      }
    });
  }

  public filterState(address: IAddress, stateTokenList: StateCountryToken[]): StateCountryToken[] {
    if (!address || !stateTokenList) {
      return [];
    }
    return stateTokenList.filter((x) => x.country === address.country);
  }

  public setAddress(editClient: IClient, currentAddressIndex: number): { editClient: IClient; currentAddressIndex: number } {
    if (!editClient.addresses) {
      editClient.addresses = [];
    }

    if (editClient.addresses.length === 0) {
      const c = new Address();
      c.validFrom = new Date();
      c.isScoped = true;
      editClient.addresses.push(c);
      currentAddressIndex = 0;
    } else {
      currentAddressIndex = this.setCurrentAddressIndex(editClient, currentAddressIndex);
    }

    return { editClient, currentAddressIndex };
  }

  private setCurrentAddressIndex(editClient: IClient, currentAddressIndex: number): number {
    if (currentAddressIndex !== -1) {
      return currentAddressIndex;
    }

    if (editClient.addresses.length > 1) {
      editClient.addresses.sort((a: IAddress, b: IAddress) => {
        const first = a.validFrom as Date;
        const second = b.validFrom as Date;
        return first > second ? -1 : first < second ? 1 : 0;
      });

      const current = new Date();
      const collectScopeAddresses: IAddress[] = [];

      editClient.hasScopeAddress = false;
      editClient.hasFutureAddress = false;
      editClient.hasPastAddress = false;

      editClient.addresses.forEach((itm) => {
        itm.isScoped = false;
        itm.isFuture = false;
        const tmpDate = new Date(itm.validFrom);

        if (tmpDate <= current) {
          collectScopeAddresses.push(itm);
          itm.isScoped = true;
          editClient.hasScopeAddress = true;
        } else {
          itm.isFuture = true;
          editClient.hasFutureAddress = true;
        }
      });

      collectScopeAddresses.sort((a: IAddress, b: IAddress) => {
        const first = a.type as number;
        const second = b.type as number;
        return first < second ? -1 : first > second ? 1 : 0;
      });

      for (let i = 0; i < this.maxAddressType; i++) {
        const findTypeArray = collectScopeAddresses.filter((x) => x.type === i);
        if (findTypeArray.length > 1) {
          for (let ii = 1; ii < findTypeArray.length; ii++) {
            findTypeArray[ii].isScoped = false;
            editClient.hasPastAddress = true;
          }
        }
      }

      if (collectScopeAddresses.length > 0) {
        return editClient.addresses.findIndex(
          (x) => x.id === collectScopeAddresses[0].id
        );
      }
    }

    if (editClient.addresses.length > 0) {
        editClient.addresses[0].isScoped = true;
        editClient.hasScopeAddress = true;
        return 0;
    }

    return -1;
  }

  public isCurrentAddressMainAddress(editClient: IClient, currentAddressIndex: number): boolean {
    if (currentAddressIndex > -1 && editClient.addresses[currentAddressIndex]) {
      return editClient.addresses[currentAddressIndex].type === 0;
    }
    return false;
  }
}
