// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';

import { EmailSettingComponent } from './email-setting.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EmailTestResult } from 'src/app/domain/interfaces/email-test.interface';

describe('EmailSettingComponent', () => {
    let component: EmailSettingComponent;
    let mockAppSettingsService: any;
    let mockDataSettingsService: any;
    let mockToastService: any;
    let emailSettingsSignal: WritableSignal<any>;
    let contactSettingsSignal: WritableSignal<any>;

    const mockEmailSettings = {
        outgoingServer: 'smtp.example.com',
        outgoingServerPort: '587',
        outgoingServerTimeout: '30',
        enabledSSL: 'true',
        authenticationType: 'LOGIN',
        dispositionNotification: 'false',
        readReceipt: '',
        replyTo: 'noreply@example.com',
        username: 'test@example.com',
        password: 'password123',
    };

    const mockContactSettings = {
        mark: 'Test Mark',
    };

    beforeEach(async () => {
        emailSettingsSignal = signal({ ...mockEmailSettings });
        contactSettingsSignal = signal({ ...mockContactSettings });

        const appSettingsServiceSpy = {
            loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
            emailSettings: emailSettingsSignal,
            contactSettings: contactSettingsSignal,
        };

        const dataSettingsServiceSpy = {
            testEmailConfiguration: vi.fn().mockReturnValue(of({ success: true, message: 'Default success' })),
        };

        const toastServiceSpy = {
            showSuccess: vi.fn(),
            showError: vi.fn(),
        };

        const translateServiceSpy = {
            instant: vi.fn().mockReturnValue('Translated text'),
            get: vi.fn().mockReturnValue(of('Translated text')),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
        };

        await TestBed.configureTestingModule({
            providers: [
                EmailSettingComponent,
                { provide: AppSettingsManagementService, useValue: appSettingsServiceSpy },
                { provide: DataSettingsVariousService, useValue: dataSettingsServiceSpy },
                { provide: ToastShowService, useValue: toastServiceSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        mockAppSettingsService = TestBed.inject(AppSettingsManagementService) as any;
        mockDataSettingsService = TestBed.inject(DataSettingsVariousService) as any;
        mockToastService = TestBed.inject(ToastShowService) as any;

        component = TestBed.inject(EmailSettingComponent);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should have default values', () => {
            // Assert
            expect(component.showPassword()).toBe(false);
            expect(component.isTestingEmail).toBe(false);
        });

        it('should load settings on init', async () => {
            // Act
            await component.ngOnInit();

            // Assert
            expect(mockAppSettingsService.loadSettingsAsync).toHaveBeenCalled();
        });
    });

    describe('Email Configuration Test', () => {
        it('should test email configuration successfully with messageKey', async () => {
            // Arrange
            await component.ngOnInit();
            const successResult: EmailTestResult = {
                success: true,
                message: 'Email configuration test successful',
                messageKey: 'EMAIL_TEST_SUCCESS_SENT',
                messageParams: { email: 'test@test.com' },
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(successResult));

            // Act
            component.testEmailConfiguration();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert
            expect(mockDataSettingsService.testEmailConfiguration).toHaveBeenCalled();
            expect(mockToastService.showSuccess).toHaveBeenCalledWith('Translated text', 'Translated text');
            expect(component.isTestingEmail).toBe(false);
        });

        it('should fall back to message when messageKey is absent', async () => {
            // Arrange
            await component.ngOnInit();
            const successResult: EmailTestResult = {
                success: true,
                message: 'Fallback message',
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(successResult));

            // Act
            component.testEmailConfiguration();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert
            expect(mockToastService.showSuccess).toHaveBeenCalledWith(successResult.message, 'Translated text');
            expect(component.isTestingEmail).toBe(false);
        });

        it('should handle email configuration test failure', async () => {
            // Arrange
            await component.ngOnInit();
            const errorResult: EmailTestResult = {
                success: false,
                message: 'Email configuration test failed',
                messageKey: 'EMAIL_TEST_AUTH_FAILED',
                errorDetails: 'SMTP authentication error',
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(errorResult));

            // Act
            component.testEmailConfiguration();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert
            expect(mockToastService.showError).toHaveBeenCalledWith(
                'Translated text',
                'Translated text',
                errorResult.errorDetails
            );
            expect(component.isTestingEmail).toBe(false);
        });

        it('should validate email address before testing', async () => {
            // Arrange
            emailSettingsSignal.set({
                ...mockEmailSettings,
                username: 'invalid-email',
            });
            await component.ngOnInit();

            // Act
            component.testEmailConfiguration();

            // Assert
            expect(mockDataSettingsService.testEmailConfiguration).not.toHaveBeenCalled();
            expect(mockToastService.showError).toHaveBeenCalled();
            expect(component.isTestingEmail).toBe(false);
        });

        it('should handle unexpected errors during email test', async () => {
            // Arrange
            await component.ngOnInit();
            const error = new Error('Network error');
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(throwError(() => error));

            // Act
            component.testEmailConfiguration();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert
            expect(mockToastService.showError).toHaveBeenCalled();
            expect(component.isTestingEmail).toBe(false);
        });

        it('should send correct email configuration to service', async () => {
            // Arrange
            await component.ngOnInit();
            const successResult: EmailTestResult = {
                success: true,
                message: 'Success',
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(successResult));

            // Act
            component.testEmailConfiguration();
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert
            const expectedConfig = {
                server: 'smtp.example.com',
                port: '587',
                enableSSL: 'true',
                authType: 'LOGIN',
                username: 'test@example.com',
                password: 'password123',
                replyTo: 'noreply@example.com',
            };
            expect(mockDataSettingsService.testEmailConfiguration).toHaveBeenCalledWith(expectedConfig);
        });
    });

    describe('Password Visibility', () => {
        it('should toggle password visibility', () => {
            // Arrange
            expect(component.showPassword()).toBe(false);

            // Act
            component.toggleShowPassword();

            // Assert
            expect(component.showPassword()).toBe(true);
        });

        it('should toggle password visibility back to hidden', () => {
            // Arrange
            component.showPassword.set(true);

            // Act
            component.toggleShowPassword();

            // Assert
            expect(component.showPassword()).toBe(false);
        });
    });

    describe('Component Lifecycle', () => {
        it('should unsubscribe on destroy', () => {
            // Arrange
            const nextSpy = vi.spyOn(component['ngUnsubscribe'], 'next');
            const completeSpy = vi.spyOn(component['ngUnsubscribe'], 'complete');

            // Act
            component.ngOnDestroy();

            // Assert
            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });
});
