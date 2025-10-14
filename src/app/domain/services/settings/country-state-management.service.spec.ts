import { TestBed } from '@angular/core/testing';
import { CountryStateManagementService } from './country-state-management.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/data-country-state.service';
import { of, throwError } from 'rxjs';
import { ICountry, IState } from 'src/app/domain/models/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('CountryStateManagementService', () => {
  let service: CountryStateManagementService;
  let dataCountryStateService: jasmine.SpyObj<DataCountryStateService>;

  const mockCountry: ICountry = {
    id: 'country-1',
    name: { de: 'Deutschland', en: 'Germany', fr: 'Allemagne', it: 'Germania' },
    abbreviation: 'DE',
    prefix: '+49',
    select: false,
    isDirty: 0
  };

  const mockState: IState = {
    id: 'state-1',
    name: { de: 'Bayern', en: 'Bavaria', fr: 'Bavière', it: 'Baviera' },
    abbreviation: 'BY',
    prefix: 'DE-BY',
    select: false,
    countryPrefix: 'DE',
    isDirty: 0
  };

  beforeEach(() => {
    const dataCountryStateServiceSpy = jasmine.createSpyObj('DataCountryStateService', [
      'getCountryList',
      'GetStateList',
      'addCountry',
      'updateCountry',
      'deleteCountry',
      'addState',
      'updateCountry',
      'deleteState'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CountryStateManagementService,
        { provide: DataCountryStateService, useValue: dataCountryStateServiceSpy }
      ]
    });

    service = TestBed.inject(CountryStateManagementService);
    dataCountryStateService = TestBed.inject(DataCountryStateService) as jasmine.SpyObj<DataCountryStateService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadCountriesAndStates', () => {
    it('should load countries and states successfully', (done) => {
      const mockCountries = [mockCountry];
      const mockStates = [mockState];

      dataCountryStateService.getCountryList.and.returnValue(of(mockCountries));
      dataCountryStateService.GetStateList.and.returnValue(of(mockStates));

      service.loadCountriesAndStates();

      setTimeout(() => {
        expect(service.countriesList()).toEqual(mockCountries);
        expect(service.statesList()).toEqual(mockStates);
        expect(service.isLoading()).toBe(false);
        done();
      }, 100);
    });

    it('should handle load error gracefully', (done) => {
      dataCountryStateService.getCountryList.and.returnValue(throwError(() => new Error('Load error')));
      dataCountryStateService.GetStateList.and.returnValue(throwError(() => new Error('Load error')));

      service.loadCountriesAndStates();

      setTimeout(() => {
        expect(service.isLoading()).toBe(false);
        done();
      }, 100);
    });

    it('should set isLoading to true during load', () => {
      dataCountryStateService.getCountryList.and.returnValue(of([]));
      dataCountryStateService.GetStateList.and.returnValue(of([]));

      service.loadCountriesAndStates();

      expect(service.isLoading()).toBe(true);
    });
  });

  describe('saveCountries', () => {
    it('should add new country when isDirty is new', (done) => {
      const newCountry = { ...mockCountry, isDirty: CreateEntriesEnum.new };
      service.countriesList.set([newCountry]);

      dataCountryStateService.addCountry.and.returnValue(of(newCountry));
      dataCountryStateService.getCountryList.and.returnValue(of([newCountry]));

      service.saveCountries();

      setTimeout(() => {
        expect(dataCountryStateService.addCountry).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should update existing country when isDirty is rewrite', (done) => {
      const updatedCountry = { ...mockCountry, isDirty: CreateEntriesEnum.rewrite };
      service.countriesList.set([updatedCountry]);

      dataCountryStateService.updateCountry.and.returnValue(of(updatedCountry));
      dataCountryStateService.getCountryList.and.returnValue(of([updatedCountry]));

      service.saveCountries();

      setTimeout(() => {
        expect(dataCountryStateService.updateCountry).toHaveBeenCalledWith(updatedCountry);
        done();
      }, 100);
    });

    it('should delete country when isDirty is delete', (done) => {
      const deletedCountry = { ...mockCountry, id: 'country-1', isDirty: CreateEntriesEnum.delete };
      service.countriesList.set([deletedCountry]);

      dataCountryStateService.deleteCountry.and.returnValue(of({} as ICountry));
      dataCountryStateService.getCountryList.and.returnValue(of([]));

      service.saveCountries();

      setTimeout(() => {
        expect(dataCountryStateService.deleteCountry).toHaveBeenCalledWith('country-1');
        done();
      }, 100);
    });
  });

  describe('saveStates', () => {
    it('should add new state when isDirty is new', (done) => {
      const newState = { ...mockState, isDirty: CreateEntriesEnum.new };
      service.statesList.set([newState]);

      dataCountryStateService.addState.and.returnValue(of(newState));
      dataCountryStateService.GetStateList.and.returnValue(of([newState]));

      service.saveStates();

      setTimeout(() => {
        expect(dataCountryStateService.addState).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should delete state when isDirty is delete', (done) => {
      const deletedState = { ...mockState, id: 'state-1', isDirty: CreateEntriesEnum.delete };
      service.statesList.set([deletedState]);

      dataCountryStateService.deleteState.and.returnValue(of({} as IState));
      dataCountryStateService.GetStateList.and.returnValue(of([]));

      service.saveStates();

      setTimeout(() => {
        expect(dataCountryStateService.deleteState).toHaveBeenCalledWith('state-1');
        done();
      }, 100);
    });
  });

  describe('isDirty checks', () => {
    it('should return false when countries are not dirty', () => {
      service.countriesList.set([mockCountry]);

      expect(service.isCountriesDirty()).toBe(false);
    });

    it('should return false when states are not dirty', () => {
      service.statesList.set([mockState]);

      expect(service.isStatesDirty()).toBe(false);
    });

    it('should return false for incomplete new entries', () => {
      const incompleteCountry: ICountry = {
        id: undefined,
        name: { de: '', en: '', fr: '', it: '' },
        abbreviation: '',
        prefix: '',
        isDirty: CreateEntriesEnum.new,
        select: false
      };
      service.countriesList.set([incompleteCountry]);

      expect(service.isCountriesDirty()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should complete destroy$ subject', () => {
      spyOn((service as any).destroy$, 'next');
      spyOn((service as any).destroy$, 'complete');

      service.destroy();

      expect((service as any).destroy$.next).toHaveBeenCalled();
      expect((service as any).destroy$.complete).toHaveBeenCalled();
    });
  });
});
