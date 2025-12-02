import { TestBed } from '@angular/core/testing';
import { CountryStateManagementService } from './country-state-management.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/data-country-state.service';
import { of, throwError } from 'rxjs';
import { ICountry, IState } from 'src/app/domain/models/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('CountryStateManagementService', () => {
    let service: CountryStateManagementService;
    let dataCountryStateService: any;

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
        const dataCountryStateServiceSpy = {
            getCountryList: vi.fn(),
            GetStateList: vi.fn(),
            addCountry: vi.fn(),
            updateCountry: vi.fn(),
            deleteCountry: vi.fn(),
            addState: vi.fn(),
            updateState: vi.fn(),
            deleteState: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                CountryStateManagementService,
                { provide: DataCountryStateService, useValue: dataCountryStateServiceSpy }
            ]
        });

        service = TestBed.inject(CountryStateManagementService);
        dataCountryStateService = TestBed.inject(DataCountryStateService) as any;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('loadCountriesAndStates', () => {
        it('should load countries and states successfully', async () => {
            const mockCountries = [mockCountry];
            const mockStates = [mockState];

            dataCountryStateService.getCountryList.mockReturnValue(of(mockCountries));
            dataCountryStateService.GetStateList.mockReturnValue(of(mockStates));

            service.loadCountriesAndStates();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(service.countriesList()).toEqual(mockCountries);
            expect(service.statesList()).toEqual(mockStates);
            expect(service.isLoading()).toBe(false);
        });

        it('should handle load error gracefully', async () => {
            dataCountryStateService.getCountryList.mockReturnValue(throwError(() => new Error('Load error')));
            dataCountryStateService.GetStateList.mockReturnValue(throwError(() => new Error('Load error')));

            service.loadCountriesAndStates();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(service.isLoading()).toBe(false);
        });

        it('should set isLoading to false after load completes', async () => {
            dataCountryStateService.getCountryList.mockReturnValue(of([]));
            dataCountryStateService.GetStateList.mockReturnValue(of([]));

            service.loadCountriesAndStates();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(service.isLoading()).toBe(false);
        });
    });

    describe('saveCountries', () => {
        it('should add new country when isDirty is new', async () => {
            const newCountry = { ...mockCountry, isDirty: CreateEntriesEnum.new };
            service.countriesList.set([newCountry]);

            dataCountryStateService.addCountry.mockReturnValue(of(newCountry));
            dataCountryStateService.getCountryList.mockReturnValue(of([newCountry]));

            service.saveCountries();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(dataCountryStateService.addCountry).toHaveBeenCalled();
        });

        it('should update existing country when isDirty is rewrite', async () => {
            const updatedCountry = { ...mockCountry, isDirty: CreateEntriesEnum.rewrite };
            service.countriesList.set([updatedCountry]);

            dataCountryStateService.updateCountry.mockReturnValue(of(updatedCountry));
            dataCountryStateService.getCountryList.mockReturnValue(of([updatedCountry]));

            service.saveCountries();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(dataCountryStateService.updateCountry).toHaveBeenCalledWith(updatedCountry);
        });

        it('should delete country when isDirty is delete', async () => {
            const deletedCountry = { ...mockCountry, id: 'country-1', isDirty: CreateEntriesEnum.delete };
            service.countriesList.set([deletedCountry]);

            dataCountryStateService.deleteCountry.mockReturnValue(of({} as ICountry));
            dataCountryStateService.getCountryList.mockReturnValue(of([]));

            service.saveCountries();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(dataCountryStateService.deleteCountry).toHaveBeenCalledWith('country-1');
        });
    });

    describe('saveStates', () => {
        it('should add new state when isDirty is new', async () => {
            const newState = { ...mockState, isDirty: CreateEntriesEnum.new };
            service.statesList.set([newState]);

            dataCountryStateService.addState.mockReturnValue(of(newState));
            dataCountryStateService.GetStateList.mockReturnValue(of([newState]));

            service.saveStates();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(dataCountryStateService.addState).toHaveBeenCalled();
        });

        it('should delete state when isDirty is delete', async () => {
            const deletedState = { ...mockState, id: 'state-1', isDirty: CreateEntriesEnum.delete };
            service.statesList.set([deletedState]);

            dataCountryStateService.deleteState.mockReturnValue(of({} as IState));
            dataCountryStateService.GetStateList.mockReturnValue(of([]));

            service.saveStates();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(dataCountryStateService.deleteState).toHaveBeenCalledWith('state-1');
        });
    });

    describe('isDirty checks', () => {
        it('should return false when countries are not dirty', async () => {
            dataCountryStateService.getCountryList.mockReturnValue(of([mockCountry]));
            dataCountryStateService.GetStateList.mockReturnValue(of([]));

            service.loadCountriesAndStates();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(service.isCountriesDirty()).toBe(false);
        });

        it('should return false when states are not dirty', async () => {
            dataCountryStateService.getCountryList.mockReturnValue(of([]));
            dataCountryStateService.GetStateList.mockReturnValue(of([mockState]));

            service.loadCountriesAndStates();

            await new Promise(resolve => setTimeout(resolve, 110));
            expect(service.isStatesDirty()).toBe(false);
        });

        it('should return false for incomplete new entries', async () => {
            dataCountryStateService.getCountryList.mockReturnValue(of([]));
            dataCountryStateService.GetStateList.mockReturnValue(of([]));

            service.loadCountriesAndStates();

            await new Promise(resolve => setTimeout(resolve, 110));
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.spyOn((service as any).destroy$, 'next');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.spyOn((service as any).destroy$, 'complete');

            service.destroy();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).destroy$.next).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).destroy$.complete).toHaveBeenCalled();
        });
    });
});
