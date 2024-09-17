import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { MyToken } from '../core/authentification-class';
import { ToastService } from '../toast/toast.service';
import { MessageLibrary } from '../helpers/string-constants';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService, ToastService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate a user and store a token on login', async () => {
    const mockUser = {
      email: 'test@test.com',
      password: 'password',
    };

    const mockToken: MyToken = {
      token: 'token',
      subject: 'subject',
      username: 'username',
      id: 'id',
      expTime: new Date(),
      isAdmin: true,
      isAuthorised: true,
      version: '1.0',
      refreshToken: 'refreshToken',
      success: false,
      errorMessage: '',
      firstName: '',
      name: '',
    };

    const loginPromise = service.logIn(mockUser.email, mockUser.password);

    const req = httpMock.expectOne(
      'https://localhost:44371/api/v1/backend/Accounts/LoginUser'
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockToken);

    const result = await loginPromise;
    expect(result).toBeTrue();
    expect(localStorage.getItem(MessageLibrary.TOKEN)).toEqual(mockToken.token);
  });

  it('should remove token on logout', () => {
    // Setup a dummy token
    localStorage.setItem(MessageLibrary.TOKEN, 'dummyToken');

    service.logOut();

    expect(localStorage.getItem(MessageLibrary.TOKEN)).toBeNull();
  });
});
