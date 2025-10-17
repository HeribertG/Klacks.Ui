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
} from '@angular/common/http';
import { ResponseInterceptor } from './presentation/error/http-interceptor';
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
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import localeIt from '@angular/common/locales/it';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CustomDatepickerI18n } from 'src/app/application/services/custom-datepicker-i18n.service';
import { AuthInterceptor } from './presentation/auth/auth.interceptor';
import { TokenRefreshInterceptor } from './presentation/auth/token-refresh.interceptor';
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

registerLocaleData(localeDe);
registerLocaleData(localeFr);
registerLocaleData(localeEn);
registerLocaleData(localeIt);

export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}

export function localeFactory(localeService: LocaleService) {
  return localeService.getLocale();
}

export function initializeDomainEventHandler(handler: DomainEventHandler) {
  return () => handler;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter([]),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeDomainEventHandler,
      deps: [DomainEventHandler],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ResponseInterceptor, multi: true },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenRefreshInterceptor,
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
      useClass: SpinnerService,
    },
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