// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-confusing-non-null-assertion */
/* eslint-disable no-prototype-builtins */
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MyToken } from 'src/app/domain/models/authentification-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ToastShowService } from '../toast/toast-show.service';
import { EqualDate } from 'src/app/shared/helpers/date.helper';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { DataLoadFileService } from '../../infrastructure/api/data-load-file.service';
import { DataAuthService } from '../../infrastructure/api/data-auth.service';
import { DataOAuth2Service } from '../../infrastructure/api/data-oauth2.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public toastShowService = inject(ToastShowService);
  private dataAuthService = inject(DataAuthService);
  private dataOAuth2Service = inject(DataOAuth2Service);
  private navigationService = inject(NavigationService);
  private localStorageService = inject(LocalStorageService);
  private dataLoadFileService = inject(DataLoadFileService);

  async logIn(userName: string, password: string): Promise<boolean> {
    return await firstValueFrom(
      this.dataAuthService.login({ email: userName, password })
    ).then((tok) => {
        if (!tok) {
          this.toastShowService.showError(
            DomainMessages.AUTH_USER_ERROR + DomainMessages.RESPONSE_ERROR,
            'AUTH_USER_ERROR'
          );
          return false;
        }

        if (
          tok &&
          typeof tok === 'object' &&
          tok.hasOwnProperty('user not exist')
        ) {
          this.toastShowService.showInfo(DomainMessages.AUTH_USER_NOT_EXIST!);
          return false;
        } else {
          this.storeToken(tok);
          return true;
        }
      })
      .catch((err) => {
        this.toastShowService.showError(
          DomainMessages.AUTH_USER_ERROR,
          'AUTH_USER_ERROR'
        );
        console.log(err);
        return false;
      });
  }

  logOut() {
    this.removeToken();
    this.removeStateValue();
    this.dataLoadFileService.clearAllImages();
  }

  async logOutWithSso(): Promise<void> {
    const providerId = this.localStorageService.get('oauth2_provider_id');

    if (providerId) {
      try {
        const postLogoutRedirectUri = window.location.origin + '/login';
        const response = await firstValueFrom(
          this.dataOAuth2Service.getLogoutUrl(providerId, postLogoutRedirectUri)
        );

        this.removeToken();
        this.removeStateValue();
        this.dataLoadFileService.clearAllImages();
        this.localStorageService.remove('oauth2_provider_id');

        if (response.supportsLogout && response.logoutUrl) {
          window.location.href = response.logoutUrl;
          return;
        }
      } catch (error) {
        console.error('SSO logout error:', error);
        this.removeToken();
        this.removeStateValue();
        this.dataLoadFileService.clearAllImages();
        this.localStorageService.remove('oauth2_provider_id');
      }
    } else {
      this.removeToken();
      this.removeStateValue();
      this.dataLoadFileService.clearAllImages();
    }

    this.navigationService.navigateToRoot();
  }

  isOAuth2User(): boolean {
    return this.localStorageService.get('oauth2_provider_id') !== null;
  }

  authenticated(): boolean {
    const res = this.localStorageService.get(StorageKeys.TOKEN) !== null;
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
    const token = this.localStorageService.get(StorageKeys.TOKEN);
    if (token !== null) {
      const currentDate = new Date();
      const tokenDate = new Date(
        this.localStorageService.get(StorageKeys.TOKEN_EXP)!
      );

      const res = EqualDate(currentDate, tokenDate);
      if (res <= 0) {
        try {
          this.refreshToken().then((x) => {
            if (x! === true) {
              this.navigationService.navigateToWorkplace();
            } else {
              this.logOut();
            }
          });
        } catch {
          this.navigationService.navigateToRoot();
          this.toastShowService.showInfo(DomainMessages.EXPIRED_TOKEN);
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

    this.localStorageService.set(StorageKeys.TOKEN, token.token);
    this.localStorageService.set(StorageKeys.TOKEN_SUBJECT, token.subject);
    this.localStorageService.set(StorageKeys.TOKEN_USERNAME, token.username);
    this.localStorageService.set(StorageKeys.TOKEN_USERID, token.id);
    this.localStorageService.set(
      StorageKeys.TOKEN_EXP,
      token.expTime!.toString()
    );
    this.localStorageService.set(
      StorageKeys.TOKEN_ADMIN,
      token.isAdmin.toString()
    );
    this.localStorageService.set(
      StorageKeys.TOKEN_AUTHORISED,
      token.isAuthorised.toString()
    );
    this.localStorageService.set(
      StorageKeys.TOKEN_APPVERSION,
      token.version
    );
    if (token.refreshToken) {
      this.localStorageService.set(
        StorageKeys.TOKEN_REFRESHTOKEN,
        token.refreshToken
      );
    }
  }

  private removeToken(isRefresh?: boolean) {
    try {
      this.localStorageService.remove(StorageKeys.TOKEN);
      this.localStorageService.remove(StorageKeys.TOKEN_EXP);
      this.localStorageService.remove(StorageKeys.TOKEN_USERNAME);
      this.localStorageService.remove(StorageKeys.TOKEN_USERID);
      this.localStorageService.remove(StorageKeys.TOKEN_ADMIN);
      this.localStorageService.remove(StorageKeys.TOKEN_AUTHORISED);
      this.localStorageService.remove(StorageKeys.TOKEN_APPVERSION);
      this.localStorageService.remove(StorageKeys.TOKEN_SUBJECT);

      if (!isRefresh) {
        this.localStorageService.remove(StorageKeys.TOKEN_REFRESHTOKEN);
        this.removeStateValue();
      }
    } catch (e: unknown) {
      console.log('removeToken error: ', e);
    }
  }

  private isAdmin(): boolean {
    let admin = false;

    if (this.localStorageService.get(StorageKeys.TOKEN_ADMIN)) {
      let tmp: string | null = this.localStorageService.get(
        StorageKeys.TOKEN_ADMIN
      );
      if (!tmp) {
        tmp = 'false';
      }
      admin = JSON.parse(tmp);
    }

    return admin;
  }

  public isAdminUser(): boolean {
    return this.isAdmin();
  }

  public isAuthorisedUser(): boolean {
    let authorised = false;

    if (this.localStorageService.get(StorageKeys.TOKEN_AUTHORISED)) {
      let tmp: string | null = this.localStorageService.get(
        StorageKeys.TOKEN_AUTHORISED
      );
      if (!tmp) {
        tmp = 'false';
      }
      authorised = JSON.parse(tmp);
    }

    return authorised;
  }

  public isAuthorisedOrAdmin(): boolean {
    return this.isAuthorisedUser() || this.isAdminUser();
  }

  errorMessage(error: string, message?: string) {
    console.log(error);

    switch (error) {
      case 'Unknown Error':
        this.navigationService.navigateToError();
        this.toastShowService.showError(DomainMessages.SERVER_NOT_VALID);

        break;

      case '200':
        this.toastShowService.showInfo(message!);
        break;

      case '204':
        this.toastShowService.showInfo(DomainMessages.HTTP204);
        break;

      case '400':
        this.toastShowService.showError(DomainMessages.HTTP400);

        break;

      case '401':
        this.logOut();
        this.navigationService.navigateToRoot();
        this.toastShowService.showError(DomainMessages.HTTP401);

        break;

      case '403':
        this.toastShowService.showError(DomainMessages.HTTP403);

        break;

      case '404':
        this.navigationService.navigateToError();
        this.toastShowService.showError(DomainMessages.HTTP404);

        break;

      default:
        this.navigationService.navigateToError();
        this.toastShowService.showError(DomainMessages.UNKNOWN_ERROR);
    }
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.localStorageService.get(
      StorageKeys.TOKEN_REFRESHTOKEN
    );

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.dataAuthService.refreshToken({ refreshToken })
      );

      if (response) {
        this.storeToken(response, true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private removeStateValue() {
    this.localStorageService.remove(RouteName.EDIT_ADDRESS);
    this.localStorageService.remove(RouteName.EDIT_GROUP);
    this.localStorageService.remove(RouteName.EDIT_SHIFT);
  }
}
