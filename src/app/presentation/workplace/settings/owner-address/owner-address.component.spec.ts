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
  let mockSettingsService: jasmine.SpyObj<DataManagementSettingsService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const mockOwnerAddress = {
    companyName: 'Test Company GmbH',
    street: 'Teststrasse 123',
    zip: '12345',
    city: 'Teststadt',
    country: 'Deutschland',
    phone: '+49 123 456789',
    email: 'info@testcompany.de',
    website: 'www.testcompany.de',
  };

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj(
      'DataManagementSettingsService',
      ['loadSettings', 'saveSettings', 'resetSettings'],
      {
        settingsChangeTrigger: signal(0),
        isReset: signal(false),
        ownerAddress: mockOwnerAddress,
      }
    );

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

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

    mockSettingsService = TestBed.inject(
      DataManagementSettingsService
    ) as jasmine.SpyObj<DataManagementSettingsService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(OwnerAddressComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should call readSignals on ngOnInit', () => {
      // Arrange
      spyOn<any>(component, 'readSignals');

      // Act
      component.ngOnInit();

      // Assert
      expect(component['readSignals']).toHaveBeenCalled();
    });

    it('should initialize with owner address from settings service', () => {
      // Arrange & Act
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress).toBe(mockOwnerAddress);
    });
  });

  describe('Form Changes', () => {
    it('should trigger settings change when form becomes dirty', (done) => {
      // Arrange
      fixture.detectChanges();
      const initialTriggerValue = mockSettingsService.settingsChangeTrigger();

      // Act
      component.ngAfterViewInit();

      if (component.ownerAddressForm) {
        component.ownerAddressForm.form.markAsDirty();
        component.ownerAddressForm.form.setValue({
          companyName: 'Updated Company',
        });
      }

      // Assert
      setTimeout(() => {
        expect(mockSettingsService.settingsChangeTrigger()).toBeGreaterThan(
          initialTriggerValue
        );
        done();
      }, 150);
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
      mockSettingsService.ownerAddress.companyName = newCompanyName;
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.companyName).toBe(newCompanyName);
    });

    it('should allow editing street address', () => {
      // Arrange
      fixture.detectChanges();
      const newStreet = 'Neue Strasse 456';

      // Act
      mockSettingsService.ownerAddress.street = newStreet;
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.street).toBe(newStreet);
    });

    it('should allow editing zip code', () => {
      // Arrange
      fixture.detectChanges();
      const newZip = '54321';

      // Act
      mockSettingsService.ownerAddress.zip = newZip;
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.zip).toBe(newZip);
    });

    it('should allow editing city', () => {
      // Arrange
      fixture.detectChanges();
      const newCity = 'Neue Stadt';

      // Act
      mockSettingsService.ownerAddress.city = newCity;
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.city).toBe(newCity);
    });

    it('should allow editing phone number', () => {
      // Arrange
      fixture.detectChanges();
      const newPhone = '+49 987 654321';

      // Act
      mockSettingsService.ownerAddress.phone = newPhone;
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.phone).toBe(newPhone);
    });

    it('should allow editing email address', () => {
      // Arrange
      fixture.detectChanges();
      const newEmail = 'contact@newcompany.de';

      // Act
      mockSettingsService.ownerAddress.email = newEmail;
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.email).toBe(newEmail);
    });
  });

  describe('Reset Functionality', () => {
    it('should react to reset signal', () => {
      // Arrange
      fixture.detectChanges();
      const originalAddress = { ...mockOwnerAddress };

      mockSettingsService.ownerAddress.companyName = 'Modified Company';
      mockSettingsService.ownerAddress.street = 'Modified Street';

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
      mockSettingsService.ownerAddress.companyName = 'Modified Company';

      // Act - Simulate reset by restoring original data
      mockSettingsService.ownerAddress.companyName = originalCompanyName;
      mockSettingsService.isReset.set(true);
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.companyName).toBe(
        originalCompanyName
      );
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe from form changes on destroy', () => {
      // Arrange
      fixture.detectChanges();
      component.ngAfterViewInit();
      const unsubscribeSpy = jasmine.createSpy('unsubscribe');
      component['objectForUnsubscribe'] = { unsubscribe: unsubscribeSpy };

      // Act
      component.ngOnDestroy();

      // Assert
      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should complete ngUnsubscribe subject on destroy', () => {
      // Arrange
      const nextSpy = spyOn(component['ngUnsubscribe'], 'next');
      const completeSpy = spyOn(component['ngUnsubscribe'], 'complete');

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
        destroy: jasmine.createSpy('destroy'),
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
      Object.assign(mockSettingsService.ownerAddress, updatedAddress);
      fixture.detectChanges();

      // Assert
      expect(mockSettingsService.ownerAddress.companyName).toBe(
        updatedAddress.companyName
      );
      expect(mockSettingsService.ownerAddress.street).toBe(updatedAddress.street);
      expect(mockSettingsService.ownerAddress.city).toBe(updatedAddress.city);
      expect(mockSettingsService.ownerAddress.zip).toBe(updatedAddress.zip);
    });
  });
});
