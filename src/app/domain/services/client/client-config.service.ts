// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import {
  ICountry,
  ICommunicationType,
  ICommunicationPrefix,
  CommunicationPrefix,
} from 'src/app/domain/models/client/client-class';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import { DataGroupVisibilityService } from 'src/app/infrastructure/api/group/data-group-visibility.service';
import { CommunicationTypeDefaultIndexEnum } from 'src/app/domain/enums/client-enum';
import { EMPTY, forkJoin, Subject, tap, catchError, retry, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';

@Injectable({
  providedIn: 'root',
})
export class ClientConfigService {
  private dataClientService = inject(DataClientService);
  private dataCountryStateService = inject(DataCountryStateService);
  private dataGroupVisibilityService = inject(DataGroupVisibilityService);
  private destroy$ = new Subject<void>();

  // On a cold start against an empty database the backend can still be seeding when this service
  // first fires. Without a retry, a single failed request would leave isInit permanently false and
  // the whole client config dead for the session. Retry with backoff so it recovers on its own.
  private static readonly INIT_RETRY_COUNT = 5;
  private static readonly INIT_RETRY_DELAY_MS = 3000;

  public stateList = signal<StateCountryToken[]>([]);
  public countries = signal<ICountry[]>([]);
  public communicationTypePhoneList = signal<ICommunicationType[]>([]);
  public communicationTypeEmailList = signal<ICommunicationType[]>([]);
  public communicationPrefixList = signal<ICommunicationPrefix[]>([]);
  public hasRootGroups = signal(false);

  public isSwissAbbreviation = 'CH';
  public isSwissPrefixId = signal('');
  public defaultTypePhone = signal(-1);
  public defaultTypeEmail = signal(-1);

  public isInit = signal(false);

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInit()) {
      return;
    }

    forkJoin({
      stateTokens: this.dataClientService.getStateTokenList(true),
      countries: this.dataCountryStateService.getCountryList(),
      communicationTypes: this.dataClientService.readCommunicationTypeList(),
      rootGroups: this.dataGroupVisibilityService.getRoots(),
    })
      .pipe(
        retry({
          count: ClientConfigService.INIT_RETRY_COUNT,
          delay: () => timer(ClientConfigService.INIT_RETRY_DELAY_MS),
        }),
        tap((results) => {
          this.processStateTokens(results.stateTokens);
          this.processCountries(results.countries);
          this.processCommunicationTypes(results.communicationTypes);
          this.hasRootGroups.set(results.rootGroups.length > 0);
        }),
        catchError((error) => {
          console.error('ClientConfigService: Error initializing data:', error);
          return EMPTY;
        })
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isInit.set(true);
      });
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
