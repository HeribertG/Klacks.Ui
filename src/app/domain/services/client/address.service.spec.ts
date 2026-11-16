// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AddressService } from './address.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { Address, IPostCodeCH } from 'src/app/domain/models/client/client-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { AppContactSettings } from 'src/app/domain/models/settings/app-settings.model';

describe('AddressService.writeCity', () => {
  let service: AddressService;
  let searchCity: ReturnType<typeof vi.fn>;
  const contactSettings = signal(new AppContactSettings());
  const setDefaultCountry = (country: string): void =>
    contactSettings.set(Object.assign(new AppContactSettings(), { country }));

  const swissHit = (zip: string, city: string, state: string): IPostCodeCH =>
    ({ id: Number(zip), name: Number(zip), zip, city, state });

  const makeAddress = (zip: string, country: string, city = '', state = ''): Address =>
    Object.assign(new Address(), { zip, country, city, state });

  const stateToken = (country: string, state: string): StateCountryToken =>
    Object.assign(new StateCountryToken(), { country, state });

  const countries = [stateToken('CH', 'BE'), stateToken('AT', 'W')];

  beforeEach(() => {
    setDefaultCountry('');
    searchCity = vi.fn(() => Promise.resolve([swissHit('3000', 'Bern', 'BE')]));
    TestBed.configureTestingModule({
      providers: [
        { provide: DataCountryStateService, useValue: { SearchCity: searchCity } },
        { provide: EVENT_BUS_TOKEN, useValue: { emit: vi.fn() } },
        { provide: AppSettingsManagementService, useValue: { contactSettings } },
      ],
    });
    service = TestBed.inject(AddressService);
  });

  it('fills city, canton and country for a Swiss address', async () => {
    const address = makeAddress('3000', 'CH');

    const result = await service.writeCity(address, countries);

    expect(searchCity).toHaveBeenCalledWith('3000');
    expect(result.address.city).toBe('Bern');
    expect(result.address.state).toBe('BE');
    expect(result.address.country).toBe('CH');
  });

  it('does not look up the postcode of an Austrian address', async () => {
    const address = makeAddress('1010', 'AT', 'Wien', 'W');

    const result = await service.writeCity(address, countries);

    expect(searchCity).not.toHaveBeenCalled();
    expect(result.address.city).toBe('Wien');
    expect(result.address.state).toBe('W');
    expect(result.address.country).toBe('AT');
    expect(result.stateList).toEqual([countries[1]]);
  });

  it('looks up an address without country when the default country is Switzerland', async () => {
    setDefaultCountry('CH');
    const address = makeAddress('3000', '');

    const result = await service.writeCity(address, countries);

    expect(searchCity).toHaveBeenCalledWith('3000');
    expect(result.address.city).toBe('Bern');
    expect(result.address.country).toBe('CH');
  });

  it('does not look up an address without country when the default country is not Switzerland', async () => {
    setDefaultCountry('AT');
    const address = makeAddress('1010', '', 'Wien');

    const result = await service.writeCity(address, countries);

    expect(searchCity).not.toHaveBeenCalled();
    expect(result.address.city).toBe('Wien');
    expect(result.address.country).toBe('');
  });

  it('does not look up an address without country when no default country is configured', async () => {
    const address = makeAddress('3000', '');

    await service.writeCity(address, countries);

    expect(searchCity).not.toHaveBeenCalled();
  });

  it('leaves a Swiss address untouched when the postcode has no hit', async () => {
    searchCity.mockResolvedValue([]);
    const address = makeAddress('9999', 'CH', 'Somewhere', 'ZH');

    const result = await service.writeCity(address, countries);

    expect(result.address.city).toBe('Somewhere');
    expect(result.address.state).toBe('ZH');
    expect(result.address.country).toBe('CH');
  });

  it('still takes the country from a prefixed postcode', async () => {
    const address = makeAddress('AT-1010', 'CH', 'Wien');

    const result = await service.writeCity(address, countries);

    expect(searchCity).not.toHaveBeenCalled();
    expect(result.address.country).toBe('AT');
    expect(result.address.city).toBe('Wien');
  });
});
