// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-confusing-non-null-assertion */
/* eslint-disable no-prototype-builtins */
import { inject, Injectable, Injector, ProviderToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { SERVER_LOGOUT_WAIT_MS } from 'src/app/domain/constants/auth-request.constants';
import { MyToken } from 'src/app/domain/models/my-token-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ToastShowService } from '../toast/toast-show.service';
import { EqualDate } from 'src/app/domain/helpers/date.helper';
import { isJwtExpired } from 'src/app/domain/helpers/jwt.helper';
import { isRefreshTokenRejection } from 'src/app/domain/helpers/refresh-token-rejection.helper';
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
import { DataHarmonizerService } from 'src/app/application/services/harmonizer/data-harmonizer.service';
import { DataHolisticHarmonizerService } from 'src/app/application/services/holistic-harmonizer/data-holistic-harmonizer.service';
import { DraftRecoveryService } from 'src/app/presentation/services/draft-recovery.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';
import { DataAutoWizardService } from 'src/app/application/services/auto-wizard/data-auto-wizard.service';
import { AutoWizardJobTrackerService } from 'src/app/presentation/workplace/schedule/services/auto-wizard-job-tracker.service';

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
  DataAutoWizardService,
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
   * Logs this device out. Revokes the refresh token in the cookie on the server and clears the cookie first
   * (fire-and-forget, so a failure never blocks the client-side logout), then clears all locally stored session
   * state, tears down every realtime hub connection and drops the session-scoped draft and instance id. The server
   * call is skipped when there is no local token - there is no local session to end. Realtime connections are stopped
   * only after removeToken(), because a deliberate hub stop schedules a reconnect that is short-circuited by the
   * now-missing token.
   */
  logOut() {
    this.requestServerLogout();

    this.removeToken();
    this.removeStateValue();
    this.dataLoadFileService.clearAllImages();
    this.dataDashboardService.invalidateGroupTreeCache();
    this.spinnerService.reset();
    this.stopRealtimeAndClearSession();
  }

  /**
   * Tears down all authenticated realtime hub connections and clears session-scoped state that
   * outlives token removal (the recoverable form draft, the loaded company clock, the
   * container-lock instance id and the AutoWizard run and its unopened results).
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
      this.injector.get(CompanyClockService).reset();
    } catch {
      // Company clock not resolvable - ignore.
    }

    try {
      sessionStorage.removeItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID);
      sessionStorage.removeItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB);
      sessionStorage.removeItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO);
    } catch {
      // sessionStorage unavailable - ignore.
    }

    try {
      this.injector.get(AutoWizardJobTrackerService).reset();
    } catch {
      // AutoWizard tracker not resolvable - ignore.
    }
  }

  private requestServerLogout(): void {
    if (!this.localStorageService.get(StorageKeys.TOKEN)) {
      return;
    }
    this.dataAuthService.logout().subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  /**
   * Server logout that finishes before the SSO sign-out leaves the page for the provider, so the cookie is revoked
   * and cleared in time. Bounded by SERVER_LOGOUT_WAIT_MS; a failure or timeout never blocks the sign-out.
   */
  private async awaitServerLogout(): Promise<void> {
    if (!this.localStorageService.get(StorageKeys.TOKEN)) {
      return;
    }
    try {
      await firstValueFrom(this.dataAuthService.logout().pipe(timeout(SERVER_LOGOUT_WAIT_MS)), {
        defaultValue: undefined,
      });
    } catch {
      // Server logout failed or timed out - the local sign-out continues.
    }
  }

  async logOutWithSso(): Promise<void> {
    const providerId = this.localStorageService.get('oauth2_provider_id');
    await this.awaitServerLogout();

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
          this.refreshToken().then(
            (x) => {
              if (x! === true) {
                this.navigationService.navigateAfterLogin();
              } else {
                this.logOut();
              }
            },
            () => undefined
          );
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
      StorageKeys.TOKEN_APPVERSION,
      token.version
    );

    this.authorizationService.store(token.permissions);
    this.loadCompanyClockIfAuthenticated();
  }

  /**
   * Triggers the company-clock load (idempotent: a second call reuses the first load) after a
   * login, a token refresh, or a boot with an already-valid token. Resolved lazily through the
   * Injector, matching REALTIME_CONNECTION_SERVICES above, so a construction-time DI cycle through
   * CompanyClockService's own HTTP call never forms.
   */
  private loadCompanyClockIfAuthenticated(): void {
    try {
      void this.injector.get(CompanyClockService).loadIfAuthenticated();
    } catch {
      // Service not resolvable - ignore.
    }
  }

  private removeToken(isRefresh?: boolean) {
    try {
      this.localStorageService.remove(StorageKeys.TOKEN);
      this.localStorageService.remove(StorageKeys.TOKEN_EXP);
      this.localStorageService.remove(StorageKeys.TOKEN_USERNAME);
      this.localStorageService.remove(StorageKeys.TOKEN_USERID);
      this.localStorageService.remove(StorageKeys.TOKEN_APPVERSION);
      this.localStorageService.remove(StorageKeys.TOKEN_SUBJECT);
      this.localStorageService.remove(StorageKeys.TOKEN_REFRESHTOKEN);
      this.authorizationService.clear();

      if (!isRefresh) {
        this.removeStateValue();
      }
    } catch {
      // Token removal error - ignored
    }
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
   * Prepares the stored session during app bootstrap, before any component or config initializer fires its first
   * authenticated request. Single-flight: concurrent callers share one run. Without a local session nothing is
   * refreshed and a leftover legacy refresh token is dropped. A still-valid session is renewed once only when it still
   * holds a refresh token from an older build (migration into the HttpOnly cookie) or lacks the rights list
   * (backfill); a failure there is swallowed and the session stays. An expired session is renewed through the cookie;
   * it is only cleared when the server actually rejected the refresh (400/401) - a network/server error is left to the
   * normal 401/login flow so a still-recoverable session is never dropped just because the backend was briefly
   * unreachable at boot.
   */
  ensureFreshTokenAtStartup(): Promise<void> {
    if (!this.startupRefreshPromise) {
      this.startupRefreshPromise = this.performStartupRefresh();
    }
    return this.startupRefreshPromise;
  }

  private async performStartupRefresh(): Promise<void> {
    const token = this.localStorageService.get(StorageKeys.TOKEN);
    if (!token) {
      this.localStorageService.remove(StorageKeys.TOKEN_REFRESHTOKEN);
      return;
    }

    if (!this.isAccessTokenExpired(token)) {
      this.loadCompanyClockIfAuthenticated();
      if (this.needsSessionRepair()) {
        await this.renewSessionQuietly();
      }
      return;
    }

    if (await this.isRefreshRejected()) {
      this.logOut();
    }
  }

  /**
   * A still-valid session needs one renewal when an older build left its refresh token in localStorage (it has to be
   * moved into the cookie before the access token expires) or when the session was opened before the backend sent
   * the rights list (nothing in storage says what the user may do).
   */
  private needsSessionRepair(): boolean {
    return (
      this.localStorageService.get(StorageKeys.TOKEN_REFRESHTOKEN) !== null ||
      !this.authorizationService.hasStoredPermissions()
    );
  }

  private async renewSessionQuietly(): Promise<void> {
    try {
      const response = await firstValueFrom(this.dataAuthService.refreshToken());
      if (response) {
        this.storeToken(response, true);
      }
    } catch {
      // Repair failed - the session stays as it is.
    }
  }

  /**
   * Attempts the startup refresh and reports whether the server explicitly rejected it (400/401 - definitely dead),
   * as opposed to succeeding or failing for an unrelated reason (network error, 5xx) that should not clear the session.
   */
  private async isRefreshRejected(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.dataAuthService.refreshToken());
      if (response) {
        this.storeToken(response, true);
      }
      return false;
    } catch (error) {
      return isRefreshTokenRejection(error);
    }
  }

  private isAccessTokenExpired(token: string): boolean {
    return isJwtExpired(token);
  }

  /**
   * Renews the access token through the refresh-token cookie. Only a tab that still holds a local session refreshes,
   * so a leftover cookie never revives a signed-out tab.
   * @returns true when renewed, false when there is no session or the server rejected the refresh (400/401) - the
   * session is dead. A transient failure (network, 5xx, 429) rejects the promise instead, so callers keep the session.
   */
  async refreshToken(): Promise<boolean> {
    if (!this.localStorageService.get(StorageKeys.TOKEN)) {
      return false;
    }

    try {
      const response = await firstValueFrom(this.dataAuthService.refreshToken());
      if (!response) {
        return false;
      }
      this.storeToken(response, true);
      return true;
    } catch (error) {
      if (isRefreshTokenRejection(error)) {
        return false;
      }
      throw error;
    }
  }

  private removeStateValue() {
    this.localStorageService.remove(RouteName.EDIT_ADDRESS);
    this.localStorageService.remove(RouteName.EDIT_GROUP);
    this.localStorageService.remove(RouteName.EDIT_SHIFT);
  }
}
