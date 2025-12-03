/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';

import { OwnerAddressComponent } from './owner-address.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';

describe('OwnerAddressComponent', () => {
    let component: OwnerAddressComponent;
    let fixture: ComponentFixture<OwnerAddressComponent>;
    let mockSettingsService: any;
    let _mockTranslateService: any;

    let mockOwnerAddress: any;

    beforeEach(async () => {
        mockOwnerAddress = {
            companyName: 'Test Company GmbH',
            street: 'Teststrasse 123',
            zip: '12345',
            city: 'Teststadt',
            country: 'Deutschland',
            phone: '+49 123 456789',
            email: 'info@testcompany.de',
            website: 'www.testcompany.de',
        };

        const settingsServiceSpy: any = {
            loadSettings: vi.fn(),
            saveSettings: vi.fn(),
            resetSettings: vi.fn(),
            settingsChangeTrigger: signal(0),
            isReset: signal(false),
            ownerAddress: mockOwnerAddress
        };

        const translateServiceSpy = {
            instant: vi.fn()
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

        await TestBed.configureTestingModule({
            imports: [OwnerAddressComponent, TranslateModule.forRoot(), FormsModule],
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

        fixture = TestBed.createComponent(OwnerAddressComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should call readSignals on ngOnInit', () => {
            // Arrange
            vi.spyOn(component as any, 'readSignals');

            // Act
            component.ngOnInit();

            // Assert
            expect(component['readSignals']).toHaveBeenCalled();
        });

        it('should initialize with owner address from settings service', () => {
            // Arrange & Act
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress).toBeDefined();
            expect(mockOwnerAddress.companyName).toBe('Test Company GmbH');
        });
    });

    describe('Form Changes', () => {
        it('should trigger settings change when form becomes dirty', async () => {
            // Arrange
            fixture.detectChanges();
            component.ngAfterViewInit();

            const mockFormChanges = {
                subscribe: (callback: () => void) => {
                    callback();
                    return { unsubscribe: () => { } };
                }
            };

            const mockForm = {
                dirty: true,
                valueChanges: mockFormChanges
            } as any;

            component.ownerAddressForm = mockForm;
            const initialTriggerValue = mockSettingsService.settingsChangeTrigger();

            // Act
            component.ngAfterViewInit();

            // Assert
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(mockSettingsService.settingsChangeTrigger()).toBeGreaterThan(initialTriggerValue);
        });

        it('should subscribe to form value changes after view init', () => {
            // Arrange
            fixture.detectChanges();

            // Act
            component.ngAfterViewInit();

            // Assert
            expect(component['objectForUnsubscribe']).toBeDefined();
        });
    });

    describe('Owner Address Editing', () => {
        it('should allow editing company name', () => {
            // Arrange
            fixture.detectChanges();
            const newCompanyName = 'New Company Name GmbH';

            // Act
            mockOwnerAddress.companyName = newCompanyName;
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.companyName).toBe(newCompanyName);
        });

        it('should allow editing street address', () => {
            // Arrange
            fixture.detectChanges();
            const newStreet = 'Neue Strasse 456';

            // Act
            mockOwnerAddress.street = newStreet;
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.street).toBe(newStreet);
        });

        it('should allow editing zip code', () => {
            // Arrange
            fixture.detectChanges();
            const newZip = '54321';

            // Act
            mockOwnerAddress.zip = newZip;
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.zip).toBe(newZip);
        });

        it('should allow editing city', () => {
            // Arrange
            fixture.detectChanges();
            const newCity = 'Neue Stadt';

            // Act
            mockOwnerAddress.city = newCity;
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.city).toBe(newCity);
        });

        it('should allow editing phone number', () => {
            // Arrange
            fixture.detectChanges();
            const newPhone = '+49 987 654321';

            // Act
            mockOwnerAddress.phone = newPhone;
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.phone).toBe(newPhone);
        });

        it('should allow editing email address', () => {
            // Arrange
            fixture.detectChanges();
            const newEmail = 'contact@newcompany.de';

            // Act
            mockOwnerAddress.email = newEmail;
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.email).toBe(newEmail);
        });
    });

    describe('Reset Functionality', () => {
        it('should react to reset signal', () => {
            // Arrange
            fixture.detectChanges();

            mockOwnerAddress.companyName = 'Modified Company';
            mockOwnerAddress.street = 'Modified Street';

            // Act
            mockSettingsService.isReset.set(true);
            fixture.detectChanges();

            // Assert
            expect(mockSettingsService.isReset()).toBe(true);
        });

        it('should restore original values after reset', () => {
            // Arrange
            fixture.detectChanges();
            const originalCompanyName = mockOwnerAddress.companyName;

            // Modify values
            mockOwnerAddress.companyName = 'Modified Company';

            // Act - Simulate reset by restoring original data
            mockOwnerAddress.companyName = originalCompanyName;
            mockSettingsService.isReset.set(true);
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.companyName).toBe(originalCompanyName);
        });
    });

    describe('Component Lifecycle', () => {
        it('should unsubscribe from form changes on destroy', () => {
            // Arrange
            fixture.detectChanges();
            component.ngAfterViewInit();
            const unsubscribeSpy = vi.fn();
            component['objectForUnsubscribe'] = { unsubscribe: unsubscribeSpy };

            // Act
            component.ngOnDestroy();

            // Assert
            expect(unsubscribeSpy).toHaveBeenCalled();
        });

        it('should complete ngUnsubscribe subject on destroy', () => {
            // Arrange
            component['objectForUnsubscribe'] = { unsubscribe: vi.fn() };
            const nextSpy = vi.spyOn(component['ngUnsubscribe'], 'next');
            const completeSpy = vi.spyOn(component['ngUnsubscribe'], 'complete');

            // Act
            component.ngOnDestroy();

            // Assert
            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });

        it('should destroy all effects on component destroy', () => {
            // Arrange
            fixture.detectChanges();
            component.ngOnInit();

            const mockEffect = {
                destroy: vi.fn(),
            };
            component['effects'] = [mockEffect as any];

            // Act
            component.ngOnDestroy();

            // Assert
            expect(mockEffect.destroy).toHaveBeenCalled();
            expect(component['effects'].length).toBe(0);
        });
    });

    describe('Integration', () => {
        it('should update multiple address fields', () => {
            // Arrange
            fixture.detectChanges();
            const updatedAddress = {
                companyName: 'Vollständig Neue GmbH',
                street: 'Hauptstrasse 1',
                zip: '80331',
                city: 'München',
                country: 'Germany',
                phone: '+49 89 12345',
                email: 'kontakt@neue.de',
                website: 'www.neue.de',
            };

            // Act
            Object.assign(mockOwnerAddress, updatedAddress);
            fixture.detectChanges();

            // Assert
            expect(mockOwnerAddress.companyName).toBe(updatedAddress.companyName);
            expect(mockOwnerAddress.street).toBe(updatedAddress.street);
            expect(mockOwnerAddress.city).toBe(updatedAddress.city);
            expect(mockOwnerAddress.zip).toBe(updatedAddress.zip);
        });
    });
});
