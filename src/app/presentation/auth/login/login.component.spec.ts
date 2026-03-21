// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { LoginComponent } from './login.component';
import { AuthService } from '../auth.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { UserAdministrationService } from 'src/app/infrastructure/api/settings/user-administration.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let authService: any;
    let authorizationService: any;
    let localStorageService: any;
    let navigationService: any;
    let translateService: any;
    let userAdministrationService: any;
    let toastService: any;

    beforeEach(async () => {
        const authServiceSpy = {
            logIn: vi.fn(),
            checkIfTokenIsValid: vi.fn()
        };
        const authorizationServiceSpy = {
            refresh: vi.fn()
        };
        const localStorageServiceSpy = {
            get: vi.fn()
        };
        const navigationServiceSpy = {
            navigateToWorkplace: vi.fn()
        };
        const translateServiceSpy = {
            setDefaultLang: vi.fn(),
            use: vi.fn(),
            instant: vi.fn(),
            get: vi.fn().mockReturnValue(of('Translated text')),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
        };
        const userAdministrationServiceSpy = {
            sendResetPasswordEmail: vi.fn()
        };
        const toastServiceSpy = {
            showSuccess: vi.fn(),
            showError: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [
                LoginComponent,
                TranslateModule.forRoot(),
                FontAwesomeModule,
                FormsModule,
                RouterTestingModule,
                HttpClientTestingModule,
                NgbModule,
            ],
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: AuthorizationService, useValue: authorizationServiceSpy },
                { provide: LocalStorageService, useValue: localStorageServiceSpy },
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
                {
                    provide: UserAdministrationService,
                    useValue: userAdministrationServiceSpy,
                },
                { provide: ToastShowService, useValue: toastServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;

        authService = TestBed.inject(AuthService) as any;
        authorizationService = TestBed.inject(AuthorizationService) as any;
        localStorageService = TestBed.inject(LocalStorageService) as any;
        navigationService = TestBed.inject(NavigationService) as any;
        translateService = TestBed.inject(TranslateService) as any;
        userAdministrationService = TestBed.inject(UserAdministrationService) as any;
        toastService = TestBed.inject(ToastShowService) as any;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.username).toBe('');
        expect(component.password).toBe('');
        expect(component.isClicked).toBe(false);
        expect(component.showPassword).toBe(false);
    });

    it('should set default language on ngOnInit', () => {
        localStorageService.get.mockReturnValue(null);

        component.ngOnInit();

        expect(translateService.setDefaultLang).toHaveBeenCalledWith(DomainMessages.DEFAULT_LANG);
    });

    it('should use saved language if available', () => {
        const savedLang = 'de';
        localStorageService.get.mockReturnValue(savedLang);

        component.ngOnInit();

        expect(translateService.use).toHaveBeenCalledWith(savedLang);
    });

    it('should check token validity on ngAfterViewInit', () => {
        authService.checkIfTokenIsValid.mockReturnValue();

        component.ngAfterViewInit();

        expect(authService.checkIfTokenIsValid).toHaveBeenCalled();
    });

    it('should handle successful login', async () => {
        component.username = 'testuser';
        component.password = 'testpass';

        // Mock the loginForm
        component.loginForm = {
            form: {
                valid: true,
            },
        } as any;

        authService.logIn.mockReturnValue(Promise.resolve(true));

        await component.onSave();

        expect(authService.logIn).toHaveBeenCalledWith('testuser', 'testpass');
        expect(navigationService.navigateToWorkplace).toHaveBeenCalled();
        expect(authorizationService.refresh).toHaveBeenCalled();
        expect(component.isClicked).toBe(false);
    });

    it('should handle failed login', async () => {
        component.username = 'testuser';
        component.password = 'wrongpass';

        // Mock the loginForm
        component.loginForm = {
            form: {
                valid: true,
            },
        } as any;

        authService.logIn.mockReturnValue(Promise.resolve(false));

        await component.onSave();

        expect(authService.logIn).toHaveBeenCalledWith('testuser', 'wrongpass');
        expect(navigationService.navigateToWorkplace).not.toHaveBeenCalled();
        expect(authorizationService.refresh).toHaveBeenCalled();
        expect(component.isClicked).toBe(false);
    });

    it('should set isClicked to true during login process', async () => {
        // Mock the loginForm
        component.loginForm = {
            form: {
                valid: true,
            },
        } as any;

        authService.logIn.mockReturnValue(Promise.resolve(true));

        const savePromise = component.onSave();
        expect(component.isClicked).toBe(true);

        await savePromise;
        expect(component.isClicked).toBe(false);
    });
});
