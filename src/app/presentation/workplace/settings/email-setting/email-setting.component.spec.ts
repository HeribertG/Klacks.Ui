/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { EmailSettingComponent } from './email-setting.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/data-settings-various.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EmailTestResult } from 'src/app/domain/models/email-test.interface';

// TODO: Fix tests after Signal Forms migration - Field directive mocking needed
describe.skip('EmailSettingComponent', () => {
    let component: EmailSettingComponent;
    let fixture: ComponentFixture<EmailSettingComponent>;
    let mockSettingsService: any;
    let mockDataSettingsService: any;
    let mockToastService: any;
    let _mockTranslateService: any;

    beforeEach(async () => {
        const settingsServiceSpy = {
            loadSettings: vi.fn(),
            settingsChangeTrigger: signal(0),
            isReset: signal(false),
            outgoingServer: 'smtp.example.com',
            outgoingServerPort: 587,
            enabledSSL: true,
            authenticationType: 'Login',
            outgoingserverUsername: 'test@example.com',
            outgoingserverPassword: 'password123',
            replyTo: 'noreply@example.com'
        };

        const dataSettingsServiceSpy = {
            testEmailConfiguration: vi.fn()
        };
        dataSettingsServiceSpy.testEmailConfiguration.mockReturnValue(of({ success: true, message: 'Default success' }));

        const toastServiceSpy = {
            showSuccess: vi.fn(),
            showError: vi.fn()
        };

        const translateServiceSpy: any = {
            instant: vi.fn(),
            get: vi.fn().mockReturnValue(of('Translated text')),
            onLangChange: of({ lang: 'en' }),
            onTranslationChange: of({}),
            onDefaultLangChange: of({ lang: 'en' })
        };
        translateServiceSpy.instant.mockReturnValue('Translated text');

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

        mockSettingsService = TestBed.inject(DataManagementSettingsService) as any;
        mockDataSettingsService = TestBed.inject(DataSettingsVariousService) as any;
        mockToastService = TestBed.inject(ToastShowService) as any;
        _mockTranslateService = TestBed.inject(TranslateService) as any;

        fixture = TestBed.createComponent(EmailSettingComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should have default values', () => {
            // Act
            fixture.detectChanges();

            // Assert
            expect(component.showPassword()).toBe(false);
            expect(component.isTestingEmail).toBe(false);
        });
    });

    describe('Email Configuration Test', () => {
        it('should test email configuration successfully', async () => {
            // Arrange
            const successResult: EmailTestResult = {
                success: true,
                message: 'Email configuration test successful',
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(successResult));

            // Act
            component.testEmailConfiguration();

            // Assert
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(mockDataSettingsService.testEmailConfiguration).toHaveBeenCalled();
            expect(mockToastService.showSuccess).toHaveBeenCalledWith(successResult.message, 'Translated text');
            expect(component.isTestingEmail).toBe(false);
        });

        it('should handle email configuration test failure', async () => {
            // Arrange
            const errorResult: EmailTestResult = {
                success: false,
                message: 'Email configuration test failed',
                errorDetails: 'SMTP authentication error',
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(errorResult));

            // Act
            component.testEmailConfiguration();

            // Assert
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(mockToastService.showError).toHaveBeenCalledWith(errorResult.message, 'Translated text', errorResult.errorDetails);
            expect(component.isTestingEmail).toBe(false);
        });

        it('should validate email address before testing', () => {
            // Arrange
            Object.defineProperty(mockSettingsService, 'outgoingserverUsername', {
                value: 'invalid-email',
                writable: true,
                configurable: true
            });

            // Act
            component.testEmailConfiguration();

            // Assert
            expect(mockDataSettingsService.testEmailConfiguration).not.toHaveBeenCalled();
            expect(mockToastService.showError).toHaveBeenCalled();
            expect(component.isTestingEmail).toBe(false);
        });

        it('should handle unexpected errors during email test', async () => {
            // Arrange
            const error = new Error('Network error');
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(throwError(() => error));

            // Act
            component.testEmailConfiguration();

            // Assert
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(mockToastService.showError).toHaveBeenCalled();
            expect(component.isTestingEmail).toBe(false);
        });

        it('should send correct email configuration to service', async () => {
            // Arrange
            const successResult: EmailTestResult = {
                success: true,
                message: 'Success',
            };
            mockDataSettingsService.testEmailConfiguration.mockReturnValue(of(successResult));

            // Act
            component.testEmailConfiguration();

            // Assert
            await new Promise(resolve => setTimeout(resolve, 50));
            const expectedConfig = {
                server: 'smtp.example.com',
                port: 587,
                enableSSL: true,
                authType: 'Login',
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
            component.showPassword.set(false);

            // Act
            component.toggleShowPassword();

            // Assert
            expect(component.showPassword()).toBe(true);
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
