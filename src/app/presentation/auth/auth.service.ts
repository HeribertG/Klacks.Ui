// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-confusing-non-null-assertion */
/* eslint-disable no-prototype-builtins */
import { inject, Injectable, Injector, ProviderToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MyToken } from 'src/app/domain/models/authentification-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ToastShowService } from '../toast/toast-show.service';
import { EqualDate } from 'src/app/shared/helpers/date.helper';
import { isJwtExpired } from 'src/app/shared/helpers/jwt.helper';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { DataLoadFileService } from '../../infrastructure/api/data-load-file.service';
import { DataAuthService } from '../../infrastructure/api/data-auth.service';
import { DataOAuth2Service } from '../../infrastructure/api/data-oauth2.service';
import { DataDashboardService } from '../../infrastructure/api/data-dashboard.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { EmailSignalRService } from 'src/app/infrastructure/signalr/email-signalr.service';
import { DataHarmonizerService } from 'src/app/infrastructure/api/harmonizer/data-harmonizer.service';
import { DataHolisticHarmonizerService } from 'src/app/infrastructure/api/holistic-harmonizer/data-holistic-harmonizer.service';
import { DraftRecoveryService } from 'src/app/presentation/services/draft-recovery.service';

/**
 * Realtime hub services whose authenticated push channel must be torn down on logout
 * so no live connection survives the session. Resolved lazily via Injector at logout
 * time to avoid a construction-time DI cycle (these services read the token through the
 * auth/HTTP pipeline). Each exposes an idempotent stopConnection().
 */
const REALTIME_CONNECTION_SERVICES: ProviderToken<{
  stopConnection(): Promise<void>;
}>[] = [
  SignalRService,
  AssistantSignalRService,
  EmailSignalRService,
  DataHarmonizerService,
  DataHolisticHarmonizerService,
];

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private startupRefreshPromise: Promise<void> | null = null;

  public toastShowService = inject(ToastShowService);
  private dataAuthService = inject(DataAuthService);
  private dataOAuth2Service = inject(DataOAuth2Service);
  private navigationService = inject(NavigationService);
  private localStorageService = inject(LocalStorageService);
  private dataLoadFileService = inject(DataLoadFileService);
  private authorizationService = inject(AuthorizationService);
  private spinnerService = inject(SpinnerService);
  private dataDashboardService = inject(DataDashboardService);
  private injector = inject(Injector);

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
          this.dataDashboardService.invalidateGroupTreeCache();
          return true;
        }
      })
      .catch(() => {
        this.toastShowService.showError(
          DomainMessages.AUTH_USER_ERROR,
          'AUTH_USER_ERROR'
        );
        return false;
      });
  }

  /**
   * Logs the user out. Invalidates the refresh token(s) on the server first (fire-and-forget,
   * so a failure - e.g. an already-expired access token - never blocks the client-side logout),
   * then clears all locally stored session state, tears down every realtime hub connection and
   * drops the session-scoped draft and instance id.
   *
   * The server logout request is issued before the token is removed so the auth interceptor can
   * still attach the Authorization header and connection id. Realtime connections are stopped only
   * after removeToken(), because a deliberate hub stop schedules a reconnect that is short-circuited
   * by the now-missing token.
   */
  logOut() {
    this.dataAuthService.logout().subscribe({
      next: () => undefined,
      error: () => undefined,
    });

    this.removeToken();
    this.removeStateValue();
    this.dataLoadFileService.clearAllImages();
    this.dataDashboardService.invalidateGroupTreeCache();
    this.spinnerService.reset();
    this.stopRealtimeAndClearSession();
  }

  /**
   * Tears down all authenticated realtime hub connections and clears session-scoped state that
   * outlives token removal (the recoverable form draft and the container-lock instance id).
   * Every step is best-effort and isolated so a single failure never blocks logout. Services are
   * resolved lazily through the Injector to avoid a construction-time DI cycle.
   */
  private stopRealtimeAndClearSession(): void {
    for (const token of REALTIME_CONNECTION_SERVICES) {
      try {
        void this.injector.get(token).stopConnection().catch(() => undefined);
      } catch {
        // Service not resolvable or already disposed - ignore.
      }
    }

    try {
      void this.injector.get(DraftRecoveryService).clear();
    } catch {
      // Draft recovery not resolvable - ignore.
    }

    try {
      sessionStorage.removeItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID);
    } catch {
      // sessionStorage unavailable - ignore.
    }
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
        this.dataDashboardService.invalidateGroupTreeCache();
        this.localStorageService.remove('oauth2_provider_id');
        this.stopRealtimeAndClearSession();

        if (response.supportsLogout && response.logoutUrl) {
          try {
            const url = new URL(response.logoutUrl);
            if (url.protocol === 'https:' || url.protocol === 'http:') {
              window.location.href = response.logoutUrl;
              return;
            }
          } catch {
            // Invalid URL - fall through to local navigation
          }
        }
      } catch (error) {
        console.error('SSO logout error:', error);
        this.removeToken();
        this.removeStateValue();
        this.dataLoadFileService.clearAllImages();
        this.dataDashboardService.invalidateGroupTreeCache();
        this.localStorageService.remove('oauth2_provider_id');
        this.stopRealtimeAndClearSession();
      }
    } else {
      this.removeToken();
      this.removeStateValue();
      this.dataLoadFileService.clearAllImages();
      this.dataDashboardService.invalidateGroupTreeCache();
      this.stopRealtimeAndClearSession();
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
        return this.authorizationService.isAdmin;

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
              this.navigationService.navigateAfterLogin();
            } else {
              this.logOut();
            }
          });
        } catch {
          this.navigationService.navigateToRoot();
          this.toastShowService.showInfo(DomainMessages.EXPIRED_TOKEN);
        }
      } else {
        this.navigationService.navigateAfterLogin();
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

    this.authorizationService.refresh();
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
    } catch {
      // Token removal error - ignored
    }
  }

  public isAdminUser(): boolean {
    return this.authorizationService.isAdmin;
  }

  public isAuthorisedUser(): boolean {
    return this.authorizationService.isAuthorised;
  }

  public isAuthorisedOrAdmin(): boolean {
    return this.authorizationService.isAuthorised;
  }

  errorMessage(error: string, message?: string) {

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
        this.navigationService.redirectToLogin();
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

  /**
   * Silently refreshes an expired-but-renewable access token during app bootstrap,
   * before any component or config initializer fires its first authenticated request.
   * Single-flight: concurrent callers share one refresh so the rotating refresh token
   * is never spent twice. Does nothing when there is no token, the token is still
   * valid, or no refresh token is stored - a failed refresh is left to the normal
   * 401/login flow so the session is never dropped while it is still recoverable.
   */
  ensureFreshTokenAtStartup(): Promise<void> {
    if (!this.startupRefreshPromise) {
      this.startupRefreshPromise = this.performStartupRefresh();
    }
    return this.startupRefreshPromise;
  }

  private async performStartupRefresh(): Promise<void> {
    const token = this.localStorageService.get(StorageKeys.TOKEN);
    if (!token || !this.isAccessTokenExpired(token)) {
      return;
    }

    const refreshToken = this.localStorageService.get(
      StorageKeys.TOKEN_REFRESHTOKEN
    );
    if (!refreshToken) {
      return;
    }

    await this.refreshToken();
  }

  private isAccessTokenExpired(token: string): boolean {
    return isJwtExpired(token);
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
