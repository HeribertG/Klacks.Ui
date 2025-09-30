import { inject, Injectable, signal } from '@angular/core';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import {
  ICountry,
  ICommunicationType,
  ICommunicationPrefix,
  CommunicationPrefix,
} from 'src/app/domain/models/client-class';
import { DataCountryStateService } from 'src/app/infrastructure/api/data-country-state.service';
import { CommunicationTypeDefaultIndexEnum } from 'src/app/domain/enums/client-enum';
import { EMPTY, forkJoin, tap, catchError } from 'rxjs';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';

@Injectable({
  providedIn: 'root',
})
export class ClientConfigService {
  private dataClientService = inject(DataClientService);
  private dataCountryStateService = inject(DataCountryStateService);

  public stateList = signal<StateCountryToken[]>([]);
  public countries = signal<ICountry[]>([]);
  public communicationTypePhoneList = signal<ICommunicationType[]>([]);
  public communicationTypeEmailList = signal<ICommunicationType[]>([]);
  public communicationPrefixList = signal<ICommunicationPrefix[]>([]);

  public isSwissAbbreviation = 'CH';
  public isSwissPrefixId = signal('');
  public defaultTypePhone = signal(-1);
  public defaultTypeEmail = signal(-1);

  public isInit = signal(false);

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInit()) {
      return;
    }

    forkJoin({
      stateTokens: this.dataClientService.getStateTokenList(true),
      countries: this.dataCountryStateService.getCountryList(),
      communicationTypes: this.dataClientService.readCommunicationTypeList(),
    })
      .pipe(
        tap((results) => {
          this.processStateTokens(results.stateTokens);
          this.processCountries(results.countries);
          this.processCommunicationTypes(results.communicationTypes);
        }),
        catchError((error) => {
          console.error('Error initializing data:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.isInit.set(true);
      });
  }

  private processStateTokens(stateTokens: StateCountryToken[]) {
    const filteredStates = stateTokens.filter((c) => c.state !== c.country);
    this.stateList.set(filteredStates);
  }

  private processCountries(countries: ICountry[]) {
    if (countries && countries.length > 0) {
      countries.forEach((country) => (country.select = true));
      this.countries.set(countries);

      const prefixes = countries.map((country) => {
        const prefix = new CommunicationPrefix();
        prefix.id = country.id!;
        prefix.name = country.name!.en!;
        prefix.prefix = country.prefix;
        return prefix;
      });

      const swissCountry = countries.find(
        (country) => country.abbreviation === this.isSwissAbbreviation
      );
      if (swissCountry) {
        this.isSwissPrefixId.set(swissCountry.prefix);
      }

      prefixes.unshift(new CommunicationPrefix());
      this.communicationPrefixList.set(prefixes);
    } else {
      console.warn('No countries received from the API');
      this.countries.set([]);
    }
  }

  private processCommunicationTypes(communicationTypes: ICommunicationType[]) {
    if (communicationTypes && communicationTypes.length > 0) {
      this.communicationTypePhoneList.set(
        communicationTypes.filter((type) => type.category === 0)
      );
      this.communicationTypeEmailList.set(
        communicationTypes.filter((type) => type.category === 1)
      );

      const defaultPhone = communicationTypes.find(
        (type) => type.defaultIndex === CommunicationTypeDefaultIndexEnum.phone
      );
      if (defaultPhone) {
        this.defaultTypePhone.set(defaultPhone.type);
      } else {
        console.warn('No standard phone type found');
      }

      const defaultEmail = communicationTypes.find(
        (type) => type.defaultIndex === CommunicationTypeDefaultIndexEnum.email
      );
      if (defaultEmail) {
        this.defaultTypeEmail.set(defaultEmail.type);
      } else {
        console.warn('No standard e-mail type found');
      }
    } else {
      console.warn('No communication types received from the API');
    }
  }
}
