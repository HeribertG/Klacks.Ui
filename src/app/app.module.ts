import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './surface/home/home.component';
import { MainComponent } from './surface/main/main.component';
import { NavComponent } from './surface/nav/nav.component';
import { HeaderComponent } from './surface/header/header.component';
import { FooterComponent } from './surface/footer/footer.component';
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
import {
  AuthInterceptor,
  ResponseInterceptor,
} from './helpers/http-interceptor';
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

import { IconsModule } from './icons/icons.module';
import { FormsModule } from '@angular/forms';
import { ModalModule } from './modal/modal.module';
import { SpinnerModule } from './spinner/spinner.module';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';
import localeIt from '@angular/common/locales/it';
import { DashboardHomeComponent } from './workplace/dashboard/dashboard-home/dashboard-home.component';
import { SearchComponent } from './search/search.component';
import { LoginComponent } from './auth/login/login.component';
import { ErrorComponent } from './error/error.component';
import { ScheduleModule } from './workplace/schedule/schedule.module';
import { AbsenceGanttModule } from './workplace/absence-gantt/absence-gantt.module';
import { LocaleService } from './services/locale.service';
import { CustomDatepickerI18n } from './services/custom-datepicker-i18n.service';
import { ToastsContainer } from './toast/toast.component';

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
  declarations: [
    ErrorComponent,
    LoginComponent,
    AppComponent,
    HomeComponent,
    MainComponent,
    NavComponent,
    HeaderComponent,
    FooterComponent,
    DashboardHomeComponent,
    SearchComponent,
    ToastsContainer,
  ],
  bootstrap: [AppComponent],
  imports: [
    NgbModule,
    FormsModule,
    BrowserModule,
    AppRoutingModule,
    IconsModule,
    SpinnerModule,
    FormsModule,
    CommonModule,
    ModalModule,
    ScheduleModule,
    AbsenceGanttModule,
    FontAwesomeModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    { provide: NgbDatepickerI18n, useClass: CustomDatepickerI18n },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ResponseInterceptor, multi: true },
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
