import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { MyToken } from '../core/authentification-class';
import { MessageLibrary } from '../helpers/string-constants';
import { ToastService } from '../toast/toast.service';
import { EqualDate } from '../helpers/format-helper';
import { LocalStorageService } from '../services/local-storage.service';
import { NavigationService } from '../services/navigation.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public toastService = inject(ToastService);
  private httpClient = inject(HttpClient);
  private navigationService = inject(NavigationService);
  private localStorageService = inject(LocalStorageService);

  async logIn(userName: string, password: string): Promise<boolean> {
    const user = {
      email: userName,
      password,
    };

    return await this.httpClient
      .post<MyToken>(`${environment.baseUrl}Accounts/LoginUser`, user)
      .toPromise()
      .then((tok) => {
        if (!tok) {
          this.showError(
            MessageLibrary.AUTH_USER_ERROR + MessageLibrary.RESPONSE_ERROR,
            'AUTH_USER_ERROR'
          );
          return false;
        }

        if (
          tok &&
          typeof tok === 'object' &&
          // eslint-disable-next-line no-prototype-builtins
          tok.hasOwnProperty('user not exist')
        ) {
          this.showInfo(MessageLibrary.AUTH_USER_NOT_EXIST!);
          return false;
        } else {
          this.storeToken(tok);
          return true;
        }
      })
      .catch((err) => {
        this.showError(MessageLibrary.AUTH_USER_ERROR, 'AUTH_USER_ERROR');
        console.log(err);
        return false;
      });
  }

  logOut() {
    this.removeToken();
    this.navigationService.navigateToRoot();
  }

  authenticated(): boolean {
    const res = this.localStorageService.get(MessageLibrary.TOKEN) !== null;
    return res;
  }

  isAuthorised(url: string): boolean {
    switch (url) {
      case '/workplace/settings':
        return this.isAdmin();

      default:
        return true;
    }
  }

  checkIfTokenIsValid(): void {
    const token = this.localStorageService.get(MessageLibrary.TOKEN);
    if (token !== null) {
      const currentDate = new Date();
      const tokenDate = new Date(
        this.localStorageService.get(MessageLibrary.TOKEN_EXP)!
      );

      const res = EqualDate(currentDate, tokenDate);
      if (res <= 0) {
        try {
          this.refreshToken().then((x) => {
            // eslint-disable-next-line @typescript-eslint/no-confusing-non-null-assertion
            if (x! === true) {
              this.navigationService.navigateToWorkplace();
            } else {
              this.logOut();
            }
          });
        } catch {
          this.navigationService.navigateToRoot();
          this.showInfo(MessageLibrary.EXPIRED_TOKEN);
        }
      } else {
        this.navigationService.navigateToWorkplace();
      }
    } else {
      this.logOut();
    }
  }

  private storeToken(token: MyToken, isRefresh?: boolean): void {
    this.removeToken(isRefresh);

    this.localStorageService.set(MessageLibrary.TOKEN, token.token);
    this.localStorageService.set(MessageLibrary.TOKEN_SUBJECT, token.subject);
    this.localStorageService.set(MessageLibrary.TOKEN_USERNAME, token.username);
    this.localStorageService.set(MessageLibrary.TOKEN_USERID, token.id);
    this.localStorageService.set(
      MessageLibrary.TOKEN_EXP,
      token.expTime!.toString()
    );
    this.localStorageService.set(
      MessageLibrary.TOKEN_ADMIN,
      token.isAdmin.toString()
    );
    this.localStorageService.set(
      MessageLibrary.TOKEN_AUTHORISED,
      token.isAuthorised.toString()
    );
    this.localStorageService.set(
      MessageLibrary.TOKEN_APPVERSION,
      token.version
    );
    if (token.refreshToken) {
      this.localStorageService.set(
        MessageLibrary.TOKEN_REFRESHTOKEN,
        token.refreshToken
      );
    }
  }

  private removeToken(isRefresh?: boolean) {
    try {
      this.localStorageService.remove(MessageLibrary.TOKEN);
      this.localStorageService.remove(MessageLibrary.TOKEN_EXP);
      this.localStorageService.remove(MessageLibrary.TOKEN_USERNAME);
      this.localStorageService.remove(MessageLibrary.TOKEN_USERID);
      this.localStorageService.remove(MessageLibrary.TOKEN_ADMIN);
      this.localStorageService.remove(MessageLibrary.TOKEN_AUTHORISED);
      this.localStorageService.remove(MessageLibrary.TOKEN_APPVERSION);
      this.localStorageService.remove(MessageLibrary.TOKEN_SUBJECT);

      if (!isRefresh) {
        this.localStorageService.remove(MessageLibrary.TOKEN_REFRESHTOKEN);
      }
    } catch (e: unknown) {
      console.log('removeToken error: ', e);
    }
  }

  private isAdmin(): boolean {
    let admin = false;

    if (this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)) {
      let tmp: string | null = this.localStorageService.get(
        MessageLibrary.TOKEN_ADMIN
      );
      if (!tmp) {
        tmp = 'false';
      }
      admin = JSON.parse(tmp);
    }

    return admin;
  }

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }

  showInfo(Message: string, infoName = '') {
    if (infoName) {
      const y = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(y);
    }
    this.toastService.show(Message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
    });
  }

  errorMessage(error: string, message?: string) {
    console.log(error);

    switch (error) {
      case 'Unknown Error':
        this.navigationService.navigateToError();
        this.showError(MessageLibrary.SERVER_NOT_VALID);

        break;

      case '200':
        this.showInfo(message!);
        break;

      case '204':
        this.showInfo(MessageLibrary.HTTP204);
        break;

      case '400':
        this.showError(MessageLibrary.HTTP400);

        break;

      case '401':
        this.logOut();
        this.navigationService.navigateToRoot();
        this.showError(MessageLibrary.HTTP401);

        break;

      case '403':
        this.showError(MessageLibrary.HTTP403);

        break;

      case '404':
        this.navigationService.navigateToError();
        this.showError(MessageLibrary.HTTP404);

        break;

      default:
        this.navigationService.navigateToError();
        this.showError(MessageLibrary.UNKNOWN_ERROR);
    }
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.localStorageService.get(
      MessageLibrary.TOKEN_REFRESHTOKEN
    );

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await this.httpClient
        .post<MyToken>(`${environment.baseUrl}Accounts/RefreshToken`, {
          refreshToken,
        })
        .toPromise();

      if (response) {
        this.storeToken(response, true); // isRefresh = true
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
}
