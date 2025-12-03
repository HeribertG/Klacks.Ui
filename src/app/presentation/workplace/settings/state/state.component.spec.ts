/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ElementRef } from '@angular/core';
import { signal } from '@angular/core';

import { StateComponent } from './state.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { IState } from 'src/app/domain/models/client-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('StateComponent', () => {
    let component: StateComponent;
    let fixture: ComponentFixture<StateComponent>;
    let mockSettingsService: any;
    let _mockTranslateService: any;

    const mockStates: IState[] = [
        {
            id: '1',
            abbreviation: 'BY',
            name: {
                de: 'Bayern',
                en: 'Bavaria',
                fr: 'Bavière',
                it: 'Baviera',
            } as MultiLanguage,
            countryPrefix: 'DE',
            prefix: '',
            select: false,
            isDirty: 0,
        },
        {
            id: '2',
            abbreviation: 'ZH',
            name: {
                de: 'Zürich',
                en: 'Zurich',
                fr: 'Zurich',
                it: 'Zurigo',
            } as MultiLanguage,
            countryPrefix: 'CH',
            prefix: '',
            select: false,
            isDirty: 0,
        },
    ];

    beforeEach(async () => {
        const mockCountryStateService = {
            statesList: signal([...mockStates]),
        };

        const settingsServiceSpy = {
            loadSettings: vi.fn(),
            countryStateService: mockCountryStateService
        };

        Object.defineProperty(settingsServiceSpy, 'statesList', {
            get: () => mockCountryStateService.statesList(),
        });

        const translateServiceSpy = {
            instant: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

        await TestBed.configureTestingModule({
            imports: [StateComponent, TranslateModule.forRoot()],
            providers: [
                {
                    provide: DataManagementSettingsService,
                    useValue: settingsServiceSpy,
                },
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        mockSettingsService = TestBed.inject(DataManagementSettingsService) as any;
        _mockTranslateService = TestBed.inject(TranslateService) as any;

        fixture = TestBed.createComponent(StateComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Add State', () => {
        it('should add new state with default values', () => {
            // Arrange
            const initialLength = mockStates.length;

            // Act
            component.onClickAdd();

            // Assert
            const updatedList = mockSettingsService.countryStateService.statesList();
            expect(updatedList.length).toBe(initialLength + 1);

            const newState = updatedList[updatedList.length - 1];
            expect(newState.isDirty).toBe(CreateEntriesEnum.new);
            expect(newState.name).toBeDefined();
        });

        it('should scroll to bottom after adding state', async () => {
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
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        expect(mockContainer.nativeElement.scrollTop).toBe(mockContainer.nativeElement.scrollHeight);
                        resolve();
                    }, 100);
                });
            });
        });
    });

    describe('Delete State', () => {
        it('should remove newly added state from list', () => {
            // Arrange
            component.onClickAdd();

            const currentList = mockSettingsService.countryStateService.statesList();
            const indexToDelete = currentList.length - 1;

            // Act
            component.openDeleteState(indexToDelete);
            component['deleteState'](indexToDelete.toString());

            // Assert
            const updatedList = mockSettingsService.countryStateService.statesList();
            expect(updatedList.length).toBe(mockStates.length);
        });

        it('should mark existing state as deleted', () => {
            // Arrange
            const currentList = [...mockStates];
            mockSettingsService.countryStateService.statesList.set(currentList);
            const indexToDelete = 0;

            // Act
            component.openDeleteState(indexToDelete);
            component['deleteState'](indexToDelete.toString());

            // Assert
            const updatedList = mockSettingsService.countryStateService.statesList();
            const deletedState = updatedList[indexToDelete];
            expect(deletedState.isDirty).toBe(CreateEntriesEnum.delete);
            expect(deletedState.name!.de).toContain('--isDeleted');
        });

        it('should handle invalid index gracefully', () => {
            // Arrange
            mockSettingsService.countryStateService.statesList.set([...mockStates]);

            // Act & Assert
            expect(() => component.openDeleteState(-1)).not.toThrow();
            expect(() => component.openDeleteState(999)).not.toThrow();
        });
    });

    describe('Edit State', () => {
        it('should update state abbreviation', () => {
            // Arrange
            const currentList = [...mockStates];
            mockSettingsService.countryStateService.statesList.set(currentList);
            const newAbbreviation = 'BW';

            // Act
            currentList[0].abbreviation = newAbbreviation;
            component.onIsChanging();

            // Assert
            const updatedList = mockSettingsService.countryStateService.statesList();
            expect(updatedList[0].abbreviation).toBe(newAbbreviation);
        });

        it('should update state country prefix', () => {
            // Arrange
            const currentList = [...mockStates];
            mockSettingsService.countryStateService.statesList.set(currentList);
            const newCountryPrefix = 'AT';

            // Act
            currentList[0].countryPrefix = newCountryPrefix;
            component.onIsChanging();

            // Assert
            const updatedList = mockSettingsService.countryStateService.statesList();
            expect(updatedList[0].countryPrefix).toBe(newCountryPrefix);
        });
    });
});
