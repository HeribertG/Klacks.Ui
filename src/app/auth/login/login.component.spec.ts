import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { LoginComponent } from './login.component';
import { AuthService } from '../auth.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let authorizationService: jasmine.SpyObj<AuthorizationService>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logIn', 'checkIfTokenIsValid']);
    const authorizationServiceSpy = jasmine.createSpyObj('AuthorizationService', ['refresh']);
    const localStorageServiceSpy = jasmine.createSpyObj('LocalStorageService', ['get']);
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['navigateToWorkplace']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['setDefaultLang', 'use']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        TranslateModule.forRoot(),
        FontAwesomeModule,
        FormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuthorizationService, useValue: authorizationServiceSpy },
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authorizationService = TestBed.inject(AuthorizationService) as jasmine.SpyObj<AuthorizationService>;
    localStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
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
    authService.logIn.and.returnValue(Promise.resolve(false));
    
    await component.onSave();
    
    expect(authService.logIn).toHaveBeenCalledWith('testuser', 'wrongpass');
    expect(navigationService.navigateToWorkplace).not.toHaveBeenCalled();
    expect(authorizationService.refresh).toHaveBeenCalled();
    expect(component.isClicked).toBe(false);
  });

  it('should set isClicked to true during login process', async () => {
    authService.logIn.and.returnValue(Promise.resolve(true));
    
    const savePromise = component.onSave();
    expect(component.isClicked).toBe(true);
    
    await savePromise;
    expect(component.isClicked).toBe(false);
  });
});