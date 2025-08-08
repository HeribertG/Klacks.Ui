import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'authenticated',
      'isAuthorised',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authGuard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should return true if user is authenticated and authorised', () => {
    authService.authenticated.and.returnValue(true);
    authService.isAuthorised.and.returnValue(true);
    const snapshot = { url: '/someurl' } as RouterStateSnapshot;

    expect(
      authGuard.canActivate({} as ActivatedRouteSnapshot, snapshot)
    ).toBeTrue();
  });

  it('should navigate to root and return false if user is not authenticated', () => {
    authService.authenticated.and.returnValue(false);
    authService.isAuthorised.and.returnValue(true);
    const snapshot = { url: '/someurl' } as RouterStateSnapshot;

    expect(
      authGuard.canActivate({} as ActivatedRouteSnapshot, snapshot)
    ).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate to root and return false if user is not authorised', () => {
    authService.authenticated.and.returnValue(true);
    authService.isAuthorised.and.returnValue(false);
    const snapshot = { url: '/someurl' } as RouterStateSnapshot;

    expect(
      authGuard.canActivate({} as ActivatedRouteSnapshot, snapshot)
    ).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
