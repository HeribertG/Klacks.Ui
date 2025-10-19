/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ElementRef } from '@angular/core';
import { signal } from '@angular/core';

import { CountriesComponent } from './countries.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { Country, ICountry } from 'src/app/domain/models/client-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('CountriesComponent', () => {
  let component: CountriesComponent;
  let fixture: ComponentFixture<CountriesComponent>;
  let mockSettingsService: jasmine.SpyObj<DataManagementSettingsService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const mockCountries: ICountry[] = [
    {
      id: '1',
      abbreviation: 'DE',
      name: {
        de: 'Deutschland',
        en: 'Germany',
        fr: 'Allemagne',
        it: 'Germania',
      } as MultiLanguage,
      prefix: '+49',
      select: false,
      isDirty: 0,
    },
    {
      id: '2',
      abbreviation: 'CH',
      name: {
        de: 'Schweiz',
        en: 'Switzerland',
        fr: 'Suisse',
        it: 'Svizzera',
      } as MultiLanguage,
      prefix: '+41',
      select: false,
      isDirty: 0,
    },
    {
      id: '3',
      abbreviation: 'AT',
      name: {
        de: 'Österreich',
        en: 'Austria',
        fr: 'Autriche',
        it: 'Austria',
      } as MultiLanguage,
      prefix: '+43',
      select: false,
      isDirty: 0,
    },
  ];

  beforeEach(async () => {
    const mockCountryStateService = {
      countriesList: signal([...mockCountries]),
    };

    const settingsServiceSpy = jasmine.createSpyObj(
      'DataManagementSettingsService',
      ['loadSettings'],
      {
        countriesList: mockCountries,
        countryStateService: mockCountryStateService,
      }
    );

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    await TestBed.configureTestingModule({
      imports: [CountriesComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: settingsServiceSpy,
        },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockSettingsService = TestBed.inject(
      DataManagementSettingsService
    ) as jasmine.SpyObj<DataManagementSettingsService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(CountriesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Add Country', () => {
    it('should add new country with default values', () => {
      // Arrange
      const initialLength = mockCountries.length;

      // Act
      component.onClickAdd();

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList.length).toBe(initialLength + 1);

      const newCountry = updatedList[updatedList.length - 1];
      expect(newCountry.isDirty).toBe(CreateEntriesEnum.new);
      expect(newCountry.name).toBeDefined();
    });

    it('should scroll to bottom after adding country', (done) => {
      // Arrange
      const mockContainer = {
        nativeElement: {
          scrollTop: 0,
          scrollHeight: 1000,
        },
      };
      component.containerBox = mockContainer as ElementRef;

      // Act
      component.onClickAdd();

      // Assert
      setTimeout(() => {
        expect(mockContainer.nativeElement.scrollTop).toBe(
          mockContainer.nativeElement.scrollHeight
        );
        done();
      }, 10);
    });

    it('should not crash if containerBox is undefined', () => {
      // Arrange
      component.containerBox = undefined;

      // Act & Assert
      expect(() => component.onClickAdd()).not.toThrow();
    });
  });

  describe('Delete Country', () => {
    it('should remove newly added country from list', () => {
      // Arrange
      const newCountry = new Country();
      newCountry.name = new MultiLanguage();
      newCountry.name.de = 'New Country';
      newCountry.isDirty = CreateEntriesEnum.new;

      const currentList = [...mockCountries, newCountry];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const indexToDelete = currentList.length - 1;

      // Act
      component.onClickDelete(indexToDelete);

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList.length).toBe(mockCountries.length);
      expect(updatedList.find((c) => c.name?.de === 'New Country')).toBeUndefined();
    });

    it('should mark existing country as deleted instead of removing it', () => {
      // Arrange
      const currentList = [...mockCountries];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const indexToDelete = 0;
      const originalName = currentList[indexToDelete].name!.de;

      // Act
      component.onClickDelete(indexToDelete);

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList.length).toBe(mockCountries.length);

      const deletedCountry = updatedList[indexToDelete];
      expect(deletedCountry.isDirty).toBe(CreateEntriesEnum.delete);
      expect(deletedCountry.name!.de).toContain('--isDeleted');
      expect(deletedCountry.name!.de).toContain(originalName);
    });

    it('should handle deletion of country without name gracefully', () => {
      // Arrange
      const countryWithoutName: ICountry = {
        id: '99',
        abbreviation: 'XX',
        name: undefined,
        prefix: '+00',
        select: false,
        isDirty: 0,
      };

      const currentList = [...mockCountries, countryWithoutName];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const indexToDelete = currentList.length - 1;

      // Act & Assert
      expect(() => component.onClickDelete(indexToDelete)).not.toThrow();
    });
  });

  describe('Edit Country', () => {
    it('should update country name in German', () => {
      // Arrange
      const currentList = [...mockCountries];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const countryIndex = 0;
      const newNameDe = 'Bundesrepublik Deutschland';

      // Act
      currentList[countryIndex].name!.de = newNameDe;
      component.onIsChanging();

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList[countryIndex].name!.de).toBe(newNameDe);
    });

    it('should update country abbreviation', () => {
      // Arrange
      const currentList = [...mockCountries];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const countryIndex = 1;
      const newAbbreviation = 'SZ';

      // Act
      currentList[countryIndex].abbreviation = newAbbreviation;
      component.onIsChanging();

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList[countryIndex].abbreviation).toBe(newAbbreviation);
    });

    it('should update country prefix', () => {
      // Arrange
      const currentList = [...mockCountries];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const countryIndex = 2;
      const newPrefix = '+440';

      // Act
      currentList[countryIndex].prefix = newPrefix;
      component.onIsChanging();

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList[countryIndex].prefix).toBe(newPrefix);
    });

    it('should update country names in multiple languages', () => {
      // Arrange
      const currentList = [...mockCountries];
      mockSettingsService.countryStateService.countriesList.set(currentList);
      const countryIndex = 0;

      // Act
      currentList[countryIndex].name!.de = 'Deutschland';
      currentList[countryIndex].name!.en = 'Germany';
      currentList[countryIndex].name!.fr = 'Allemagne';
      currentList[countryIndex].name!.it = 'Germania';
      component.onIsChanging();

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      const updatedCountry = updatedList[countryIndex];
      expect(updatedCountry.name!.de).toBe('Deutschland');
      expect(updatedCountry.name!.en).toBe('Germany');
      expect(updatedCountry.name!.fr).toBe('Allemagne');
      expect(updatedCountry.name!.it).toBe('Germania');
    });
  });

  describe('Country List Management', () => {
    it('should reflect changes in countriesList signal', () => {
      // Arrange
      const currentList = [...mockCountries];

      // Act
      mockSettingsService.countryStateService.countriesList.set(currentList);

      // Assert
      const updatedList =
        mockSettingsService.countryStateService.countriesList();
      expect(updatedList).toEqual(currentList);
    });

    it('should maintain list integrity after multiple operations', () => {
      // Arrange
      const initialLength = mockCountries.length;

      // Act
      component.onClickAdd();
      component.onClickAdd();
      component.onClickDelete(0);

      // Assert
      const finalList = mockSettingsService.countryStateService.countriesList();
      expect(finalList.length).toBeGreaterThan(initialLength);

      const deletedCountry = finalList[0];
      expect(deletedCountry.isDirty).toBe(CreateEntriesEnum.delete);
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow: add, edit, and mark for deletion', () => {
      // Arrange
      const initialLength =
        mockSettingsService.countryStateService.countriesList().length;

      // Act - Add new country
      component.onClickAdd();
      let currentList =
        mockSettingsService.countryStateService.countriesList();
      const newCountryIndex = currentList.length - 1;

      // Edit new country
      currentList[newCountryIndex].abbreviation = 'FR';
      currentList[newCountryIndex].name!.de = 'Frankreich';
      currentList[newCountryIndex].prefix = '+33';
      component.onIsChanging();

      // Delete existing country
      component.onClickDelete(0);

      // Assert
      const finalList = mockSettingsService.countryStateService.countriesList();
      expect(finalList.length).toBe(initialLength + 1);

      const newCountry = finalList[newCountryIndex];
      expect(newCountry.abbreviation).toBe('FR');
      expect(newCountry.name!.de).toBe('Frankreich');
      expect(newCountry.prefix).toBe('+33');

      const deletedCountry = finalList[0];
      expect(deletedCountry.isDirty).toBe(CreateEntriesEnum.delete);
      expect(deletedCountry.name!.de).toContain('--isDeleted');
    });

    it('should add and immediately remove a new country', () => {
      // Arrange
      const initialLength =
        mockSettingsService.countryStateService.countriesList().length;

      // Act
      component.onClickAdd();
      const currentList =
        mockSettingsService.countryStateService.countriesList();
      const newCountryIndex = currentList.length - 1;

      component.onClickDelete(newCountryIndex);

      // Assert
      const finalList = mockSettingsService.countryStateService.countriesList();
      expect(finalList.length).toBe(initialLength);
    });
  });
});
