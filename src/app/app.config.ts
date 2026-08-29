// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ApplicationConfig, importProvidersFrom, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import {
  NgbDateParserFormatter,
  NgbDatepickerI18n,
  NgbModule,
} from '@ng-bootstrap/ng-bootstrap';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr
} from '@angular/common/http';
import { ResponseInterceptor } from './presentation/error/http-interceptor';
import { LoadingInterceptor } from './presentation/spinner/loading.interceptor';
import { AppErrorHandler } from './app.error-handler';
import { CanDeactivateGuard } from './application/helpers/can-deactivate.guard';
import { NgbDateCustomParserFormatter } from './infrastructure/helpers/NgbDateParserFormatter';
import { FILTER_STORAGE_TOKEN } from './application/interfaces/filter-storage.interface';
import { SessionStorageService } from './infrastructure/storage/session-storage.service';
import {
  TranslateLoader,
  TranslateModule,
  TranslatePipe,
} from '@ngx-translate/core';
import { TranslateStringConstantsService } from './application/translate/translate-string-constants.service';
import {
  CommonModule,
  CurrencyPipe,
  registerLocaleData,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpinnerModule } from './presentation/spinner/spinner.module';
import { KlacksTranslateLoaderFactory } from './infrastructure/i18n/klacks-translate-loader';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import localeIt from '@angular/common/locales/it';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CustomDatepickerI18n } from 'src/app/application/services/custom-datepicker-i18n.service';
import { AuthInterceptor } from './presentation/auth/auth.interceptor';
import { AuthService } from './presentation/auth/auth.service';
import { TokenRefreshInterceptor } from './presentation/auth/token-refresh.interceptor';
import { SetupRequiredInterceptor } from './presentation/auth/setup-required.interceptor';
import { Title } from '@angular/platform-browser';
import { DomainEventHandler } from './presentation/handlers/domain-event.handler';
import { EVENT_BUS_TOKEN } from './domain/interfaces/event-bus.interface';
import { EventBus } from './application/services/event-bus.service';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from './domain/interfaces/manageable-service-registry.interface';
import { ManageableServiceRegistry } from './application/services/manageable-service-registry';
import { ENTITY_STATE_PROVIDER_TOKEN } from './domain/interfaces/entity-state-provider.interface';
import { WorkplaceStateService } from './application/services/workplace-state.service';
import { LOADING_INDICATOR_TOKEN } from './domain/interfaces/loading-indicator.interface';
import { SpinnerService } from './presentation/spinner/spinner.service';
import { LanguageConfigService } from './application/services/language-config.service';
import { initializeLanguageHelper } from './domain/helpers/multi-language.helper';
import { SCRIPT_COMPILER } from './domain/models/automation/rules/script-compiler.interface';
import { ScriptService } from './infrastructure/scripting/script.service';
import { SEARCH_STRATEGY } from './domain/interfaces/search-strategy.interface';
import { SearchStrategyService } from './presentation/search/search-strategy.service';
import { SCHEDULE_SIGNALR } from './domain/interfaces/schedule-signalr.interface';
import { SignalRService } from './infrastructure/signalr/signalr.service';
import { providePluginHost, provideMessagingVoice } from './infrastructure/plugins/provide-plugin-host';

registerLocaleData(localeDe);
registerLocaleData(localeFr);
registerLocaleData(localeEn);
registerLocaleData(localeIt);

export function HttpLoaderFactory(httpClient: HttpClient) {
  return KlacksTranslateLoaderFactory(httpClient);
}

export function localeFactory(localeService: LocaleService) {
  return localeService.getLocale();
}

export function initializeDomainEventHandler(handler: DomainEventHandler) {
  return () => handler;
}

export function initializeAuthStartup(authService: AuthService) {
  return () => authService.ensureFreshTokenAtStartup();
}

export function initializeLanguageConfig(service: LanguageConfigService) {
  return () => service.loadConfig().then(() => initializeLanguageHelper(service));
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([]),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthStartup,
      deps: [AuthService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeDomainEventHandler,
      deps: [DomainEventHandler],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeLanguageConfig,
      deps: [LanguageConfigService],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ResponseInterceptor, multi: true },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenRefreshInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SetupRequiredInterceptor,
      multi: true,
    },
    { provide: NgbDatepickerI18n, useClass: CustomDatepickerI18n },
    { provide: AppErrorHandler, useClass: AppErrorHandler },
    { provide: CanDeactivateGuard, useClass: CanDeactivateGuard },
    { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter },
    CurrencyPipe,
    Title,
    TranslatePipe,
    TranslateStringConstantsService,
    {
      provide: LOCALE_ID,
      deps: [LocaleService],
      useFactory: localeFactory,
    },
    {
      provide: FILTER_STORAGE_TOKEN,
      useClass: SessionStorageService,
    },
    {
      provide: EVENT_BUS_TOKEN,
      useClass: EventBus,
    },
    {
      provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN,
      useClass: ManageableServiceRegistry,
    },
    {
      provide: ENTITY_STATE_PROVIDER_TOKEN,
      useExisting: WorkplaceStateService,
    },
    {
      provide: LOADING_INDICATOR_TOKEN,
      useExisting: SpinnerService,
    },
    {
      provide: SCRIPT_COMPILER,
      useExisting: ScriptService,
    },
    {
      provide: SEARCH_STRATEGY,
      useExisting: SearchStrategyService,
    },
    {
      provide: SCHEDULE_SIGNALR,
      useExisting: SignalRService,
    },
    ...providePluginHost(),
    ...provideMessagingVoice(),
    importProvidersFrom(
      NgbModule,
      FormsModule,
      CommonModule,
      FontAwesomeModule,
      SpinnerModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
      AppRoutingModule
    )
  ]
};