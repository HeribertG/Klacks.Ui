import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

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
import { ResponseInterceptor } from './error/http-interceptor';
import { AppErrorHandler } from './app.error-handler';
import { CanDeactivateGuard } from './helpers/can-deactivate.guard';
import { NgbDateCustomParserFormatter } from './helpers/NgbDateParserFormatter';
import {
  TranslateLoader,
  TranslateModule,
  TranslatePipe,
} from '@ngx-translate/core';
import { TranslateStringConstantsService } from './translate/translate-string-constants.service';
import {
  CommonModule,
  CurrencyPipe,
  registerLocaleData,
} from '@angular/common';

import { FormsModule } from '@angular/forms';
import { SpinnerModule } from './spinner/spinner.module';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import localeIt from '@angular/common/locales/it';
import { SearchComponent } from './search/search.component';
import { LoginComponent } from './auth/login/login.component';
import { ErrorComponent } from './error/error.component';
import { LocaleService } from './services/locale.service';
import { CustomDatepickerI18n } from './services/custom-datepicker-i18n.service';
import { ToastsContainerComponent } from './toast/toast.component';
import { GroupSelectComponent } from './group-select/group-select.component';
import { NoAccessComponent } from './no-access/no-access.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { TokenRefreshInterceptor } from './auth/token-refresh.interceptor';

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

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [
    LoginComponent,
    SearchComponent,
    NgbModule,
    FormsModule,
    BrowserModule,
    AppRoutingModule,
    SpinnerModule,
    FormsModule,
    CommonModule,
    FontAwesomeModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    GroupSelectComponent,
    NoAccessComponent,
    ErrorComponent,
    ToastsContainerComponent,
  ],
  providers: [
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
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {}
