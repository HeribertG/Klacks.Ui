// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { AppSettingsManagementService } from './app-settings-management.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { of } from 'rxjs';
import { ISetting, AppSetting } from 'src/app/domain/models/settings/settings-various-class';

describe('AppSettingsManagementService', () => {
    let service: AppSettingsManagementService;
    let dataSettingsService: any;

    const mockSettings: ISetting[] = [
        { id: '1', type: AppSetting.APP_NAME, value: 'Test App' },
        { id: '2', type: AppSetting.APP_ADDRESS_NAME, value: 'Test Address' },
        { id: '3', type: AppSetting.APP_OUTGOING_SERVER, value: 'smtp.test.com' }
    ];

    beforeEach(() => {
        vi.useFakeTimers();

        const dataSettingsServiceSpy = {
            readSettingList: vi.fn().mockReturnValue(of(mockSettings)),
            updateSetting: vi.fn().mockReturnValue(of({})),
            addSetting: vi.fn().mockReturnValue(of({}))
        };

        TestBed.configureTestingModule({
            providers: [
                AppSettingsManagementService,
                { provide: DataSettingsVariousService, useValue: dataSettingsServiceSpy }
            ]
        });

        service = TestBed.inject(AppSettingsManagementService);
        dataSettingsService = TestBed.inject(DataSettingsVariousService) as any;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Signal behavior', () => {
        it('should have contactSettings signal initialized', () => {
            // Assert
            expect(service.contactSettings).toBeDefined();
            expect(typeof service.contactSettings).toBe('function');
        });

        it('should have emailSettings signal initialized', () => {
            // Assert
            expect(service.emailSettings).toBeDefined();
            expect(typeof service.emailSettings).toBe('function');
        });

        it('should have isLoading signal initialized to false', () => {
            // Assert
            expect(service.isLoading()).toBe(false);
        });

        it('should have isDirty as computed signal', () => {
            // Assert
            expect(service.isDirty).toBeDefined();
            expect(typeof service.isDirty).toBe('function');
        });
    });

    describe('loadSettings', () => {
        it('should call dataSettingsService.readSettingList', () => {
            // Act
            service.loadSettings();

            // Assert
            expect(dataSettingsService.readSettingList).toHaveBeenCalled();
        });

        it('should set isLoading to false after loading completes', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));

            // Act
            service.loadSettings();

            // Assert
            expect(service.isLoading()).toBe(false);
        });

        it('should populate contactSettings from loaded settings', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));

            // Act
            service.loadSettings();

            // Assert
            expect(service.contactSettings().name).toBe('Test App');
            expect(service.contactSettings().addressName).toBe('Test Address');
        });

        it('should populate emailSettings from loaded settings', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));

            // Act
            service.loadSettings();

            // Assert
            expect(service.emailSettings().outgoingServer).toBe('smtp.test.com');
        });
    });

    describe('isDirty computed signal', () => {
        it('should return false when settings are unchanged', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));

            // Act
            service.loadSettings();

            // Assert
            expect(service.isDirty()).toBe(false);
        });

        it('should return true when contactSettings are changed', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();

            // Act
            service.contactSettings.update(s => ({ ...s, name: 'Changed Name' }));

            // Assert
            expect(service.isDirty()).toBe(true);
        });

        it('should return true when emailSettings are changed', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();

            // Act
            service.emailSettings.update(s => ({ ...s, outgoingServer: 'new.server.com' }));

            // Assert
            expect(service.isDirty()).toBe(true);
        });
    });

    describe('autoSave Timer', () => {
        it('should trigger save after 1500ms when isDirty', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            const saveSpy = vi.spyOn(service, 'save');

            // Act
            service.contactSettings.update(s => ({ ...s, name: 'Auto Save Test' }));
            TestBed.flushEffects();
            vi.advanceTimersByTime(1500);

            // Assert
            expect(saveSpy).toHaveBeenCalled();
        });

        it('should not trigger save if not isDirty', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            const saveSpy = vi.spyOn(service, 'save');

            // Act
            TestBed.flushEffects();
            vi.advanceTimersByTime(1500);

            // Assert
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it('should debounce multiple changes within 1500ms', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            const saveSpy = vi.spyOn(service, 'save');

            // Act
            service.contactSettings.update(s => ({ ...s, name: 'Change 1' }));
            TestBed.flushEffects();
            vi.advanceTimersByTime(500);
            service.contactSettings.update(s => ({ ...s, name: 'Change 2' }));
            TestBed.flushEffects();
            vi.advanceTimersByTime(500);
            service.contactSettings.update(s => ({ ...s, name: 'Change 3' }));
            TestBed.flushEffects();
            vi.advanceTimersByTime(1500);

            // Assert
            expect(saveSpy).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on each change', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            const saveSpy = vi.spyOn(service, 'save');

            // Act
            service.contactSettings.update(s => ({ ...s, name: 'Change 1' }));
            TestBed.flushEffects();
            vi.advanceTimersByTime(1400);
            service.contactSettings.update(s => ({ ...s, name: 'Change 2' }));
            TestBed.flushEffects();
            vi.advanceTimersByTime(1400);

            // Assert
            expect(saveSpy).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(saveSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('save', () => {
        it('should not save when not dirty', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();

            // Act
            service.save();

            // Assert
            expect(dataSettingsService.updateSetting).not.toHaveBeenCalled();
            expect(dataSettingsService.addSetting).not.toHaveBeenCalled();
        });

        it('should call updateSetting for changed existing setting', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            service.contactSettings.update(s => ({ ...s, name: 'Updated Name' }));

            // Act
            service.save();

            // Assert
            expect(dataSettingsService.updateSetting).toHaveBeenCalled();
        });
    });

    describe('ACTIVE_INDUSTRIES', () => {
        const allSlugs = ['homecare', 'healthcare', 'security', 'facility', 'logistics'];

        it('should default to all industries when the setting is missing', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));

            // Act
            service.loadSettings();

            // Assert
            expect(service.activeIndustriesSettings().activeIndustries).toEqual(allSlugs);
        });

        it('should default to all industries when the setting value is empty', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of([
                ...mockSettings,
                { id: '4', type: AppSetting.ACTIVE_INDUSTRIES, value: '' }
            ]));

            // Act
            service.loadSettings();

            // Assert
            expect(service.activeIndustriesSettings().activeIndustries).toEqual(allSlugs);
        });

        it('should load exactly the stored industries', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of([
                ...mockSettings,
                { id: '4', type: AppSetting.ACTIVE_INDUSTRIES, value: 'healthcare,security' }
            ]));

            // Act
            service.loadSettings();

            // Assert
            expect(service.activeIndustriesSettings().activeIndustries).toEqual(['healthcare', 'security']);
        });

        it('should save the selection as a comma separated value', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            service.activeIndustriesSettings.update(s => ({ ...s, activeIndustries: ['healthcare', 'security'] }));

            // Act
            service.save();

            // Assert
            expect(dataSettingsService.addSetting).toHaveBeenCalledWith(
                expect.objectContaining({ type: AppSetting.ACTIVE_INDUSTRIES, value: 'healthcare,security' })
            );
        });

        it('should never write an empty value for an empty selection', () => {
            // Arrange
            dataSettingsService.readSettingList.mockReturnValue(of(mockSettings));
            service.loadSettings();
            service.activeIndustriesSettings.update(s => ({ ...s, activeIndustries: [] }));

            // Act
            service.save();

            // Assert
            const writtenValues = [
                ...dataSettingsService.addSetting.mock.calls,
                ...dataSettingsService.updateSetting.mock.calls,
            ]
                .map((call: any[]) => call[0])
                .filter((setting: any) => setting.type === AppSetting.ACTIVE_INDUSTRIES)
                .map((setting: any) => setting.value);
            expect(writtenValues).not.toContain('');
        });
    });

    describe('resetData', () => {
        it('should call loadSettings', () => {
            // Arrange
            const loadSettingsSpy = vi.spyOn(service, 'loadSettings');

            // Act
            service.resetData();

            // Assert
            expect(loadSettingsSpy).toHaveBeenCalled();
        });
    });
});
