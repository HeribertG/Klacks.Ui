import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { UserAdministrationService } from 'src/app/infrastructure/api/user-administration.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let authorizationService: jasmine.SpyObj<AuthorizationService>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let translateService: jasmine.SpyObj<TranslateService>;
  let userAdministrationService: jasmine.SpyObj<UserAdministrationService>;
  let toastService: jasmine.SpyObj<ToastShowService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logIn', 'checkIfTokenIsValid']);
    const authorizationServiceSpy = jasmine.createSpyObj('AuthorizationService', ['refresh']);
    const localStorageServiceSpy = jasmine.createSpyObj('LocalStorageService', ['get']);
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['navigateToWorkplace']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['setDefaultLang', 'use', 'instant']);
    const userAdministrationServiceSpy = jasmine.createSpyObj('UserAdministrationService', ['sendResetPasswordEmail']);
    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        TranslateModule.forRoot(),
        FontAwesomeModule,
        FormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        NgbModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuthorizationService, useValue: authorizationServiceSpy },
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: UserAdministrationService, useValue: userAdministrationServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authorizationService = TestBed.inject(AuthorizationService) as jasmine.SpyObj<AuthorizationService>;
    localStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    userAdministrationService = TestBed.inject(UserAdministrationService) as jasmine.SpyObj<UserAdministrationService>;
    toastService = TestBed.inject(ToastShowService) as jasmine.SpyObj<ToastShowService>;
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
    localStorageService.get.and.returnValue(null);
    
    component.ngOnInit();
    
    expect(translateService.setDefaultLang).toHaveBeenCalledWith(MessageLibrary.DEFAULT_LANG);
  });

  it('should use saved language if available', () => {
    const savedLang = 'de';
    localStorageService.get.and.returnValue(savedLang);
    
    component.ngOnInit();
    
    expect(translateService.use).toHaveBeenCalledWith(savedLang);
  });

  it('should check token validity on ngAfterViewInit', () => {
    authService.checkIfTokenIsValid.and.returnValue();
    
    component.ngAfterViewInit();
    
    expect(authService.checkIfTokenIsValid).toHaveBeenCalled();
  });

  it('should handle successful login', async () => {
    component.username = 'testuser';
    component.password = 'testpass';
    
    // Mock the loginForm
    component.loginForm = {
      form: {
        valid: true
      }
    } as any;
    
    authService.logIn.and.returnValue(Promise.resolve(true));
    
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
        valid: true
      }
    } as any;
    
    authService.logIn.and.returnValue(Promise.resolve(false));
    
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
        valid: true
      }
    } as any;
    
    authService.logIn.and.returnValue(Promise.resolve(true));
    
    const savePromise = component.onSave();
    expect(component.isClicked).toBe(true);
    
    await savePromise;
    expect(component.isClicked).toBe(false);
  });
});