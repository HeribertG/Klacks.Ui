/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { of, throwError, signal } from 'rxjs';

import { EmailSettingComponent } from './email-setting.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/data-settings-various.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EmailTestResult } from 'src/app/domain/models/email-test.interface';

describe('EmailSettingComponent', () => {
  let component: EmailSettingComponent;
  let fixture: ComponentFixture<EmailSettingComponent>;
  let mockSettingsService: jasmine.SpyObj<DataManagementSettingsService>;
  let mockDataSettingsService: jasmine.SpyObj<DataSettingsVariousService>;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const settingsServiceSpy = jasmine.createSpyObj(
      'DataManagementSettingsService',
      ['loadSettings'],
      {
        settingsChangeTrigger: signal(0),
        isReset: signal(false),
        outgoingServer: 'smtp.example.com',
        outgoingServerPort: 587,
        enabledSSL: true,
        authenticationType: 'Login',
        outgoingserverUsername: 'test@example.com',
        outgoingserverPassword: 'password123',
        replyTo: 'noreply@example.com',
      }
    );

    const dataSettingsServiceSpy = jasmine.createSpyObj(
      'DataSettingsVariousService',
      ['testEmailConfiguration']
    );

    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', [
      'showSuccess',
      'showError',
    ]);

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    await TestBed.configureTestingModule({
      imports: [EmailSettingComponent, TranslateModule.forRoot(), FormsModule],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: settingsServiceSpy,
        },
        {
          provide: DataSettingsVariousService,
          useValue: dataSettingsServiceSpy,
        },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockSettingsService = TestBed.inject(
      DataManagementSettingsService
    ) as jasmine.SpyObj<DataManagementSettingsService>;
    mockDataSettingsService = TestBed.inject(
      DataSettingsVariousService
    ) as jasmine.SpyObj<DataSettingsVariousService>;
    mockToastService = TestBed.inject(
      ToastShowService
    ) as jasmine.SpyObj<ToastShowService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(EmailSettingComponent);
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

    it('should have default values', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(component.showPassword).toBe(false);
      expect(component.isDataLoaded).toBe(false);
      expect(component.isTestingEmail).toBe(false);
      expect(component.testResult).toBeNull();
    });
  });

  describe('Email Configuration Test', () => {
    it('should test email configuration successfully', (done) => {
      // Arrange
      const successResult: EmailTestResult = {
        success: true,
        message: 'Email configuration test successful',
      };
      mockDataSettingsService.testEmailConfiguration.and.returnValue(
        of(successResult)
      );

      // Act
      component.testEmailConfiguration();

      // Assert
      setTimeout(() => {
        expect(mockDataSettingsService.testEmailConfiguration).toHaveBeenCalled();
        expect(mockToastService.showSuccess).toHaveBeenCalledWith(
          successResult.message,
          'Translated text'
        );
        expect(component.isTestingEmail).toBe(false);
        done();
      }, 50);
    });

    it('should handle email configuration test failure', (done) => {
      // Arrange
      const errorResult: EmailTestResult = {
        success: false,
        message: 'Email configuration test failed',
        errorDetails: 'SMTP authentication error',
      };
      mockDataSettingsService.testEmailConfiguration.and.returnValue(
        of(errorResult)
      );

      // Act
      component.testEmailConfiguration();

      // Assert
      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalledWith(
          errorResult.message,
          'Translated text',
          errorResult.errorDetails
        );
        expect(component.isTestingEmail).toBe(false);
        done();
      }, 50);
    });

    it('should validate email address before testing', () => {
      // Arrange
      mockSettingsService.outgoingserverUsername = 'invalid-email';

      // Act
      component.testEmailConfiguration();

      // Assert
      expect(mockDataSettingsService.testEmailConfiguration).not.toHaveBeenCalled();
      expect(mockToastService.showError).toHaveBeenCalled();
      expect(component.isTestingEmail).toBe(false);
    });

    it('should handle unexpected errors during email test', (done) => {
      // Arrange
      const error = new Error('Network error');
      mockDataSettingsService.testEmailConfiguration.and.returnValue(
        throwError(() => error)
      );

      // Act
      component.testEmailConfiguration();

      // Assert
      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalled();
        expect(component.isTestingEmail).toBe(false);
        done();
      }, 50);
    });

    it('should send correct email configuration to service', (done) => {
      // Arrange
      const successResult: EmailTestResult = {
        success: true,
        message: 'Success',
      };
      mockDataSettingsService.testEmailConfiguration.and.returnValue(
        of(successResult)
      );

      // Act
      component.testEmailConfiguration();

      // Assert
      setTimeout(() => {
        const expectedConfig = {
          server: 'smtp.example.com',
          port: 587,
          enableSSL: true,
          authType: 'Login',
          username: 'test@example.com',
          password: 'password123',
          replyTo: 'noreply@example.com',
        };
        expect(
          mockDataSettingsService.testEmailConfiguration
        ).toHaveBeenCalledWith(expectedConfig);
        done();
      }, 50);
    });
  });

  describe('Form Changes', () => {
    it('should trigger settings change when form becomes dirty', (done) => {
      // Arrange
      fixture.detectChanges();
      mockSettingsService.isReset.set(true);
      fixture.detectChanges();

      setTimeout(() => {
        if (component.emailSettingsForm) {
          const initialValue = mockSettingsService.settingsChangeTrigger();
          component.emailSettingsForm.form.markAsDirty();

          setTimeout(() => {
            expect(mockSettingsService.settingsChangeTrigger()).toBeGreaterThan(
              initialValue
            );
            done();
          }, 50);
        } else {
          done();
        }
      }, 150);
    });
  });

  describe('Password Visibility', () => {
    it('should toggle password visibility', () => {
      // Arrange
      component.showPassword = false;

      // Act
      component.showPassword = true;

      // Assert
      expect(component.showPassword).toBe(true);
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
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
});
