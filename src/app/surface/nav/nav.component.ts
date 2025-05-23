import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Inject,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { IconChartComponent } from 'src/app/icons/icon-chart.component';
import { IconClientsComponent } from 'src/app/icons/icon-clients.component';
import { IconGanttComponent } from 'src/app/icons/icon-gantt.component';
import { IconGroupComponent } from 'src/app/icons/icon-group.component';
import { IconOrderComponent } from 'src/app/icons/icon-order.component';
import { IconSettingComponent } from 'src/app/icons/icon-setting.component';
import { IconTimeScheduleComponent } from 'src/app/icons/icon-time-schedule.component';
import { IconUserComponent } from 'src/app/icons/icon-user.component';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import {
  LocaleService,
  SupportedLocales,
} from 'src/app/services/locale.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { TranslateStringConstantsService } from 'src/app/translate/translate-string-constants.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  imports: [
    CommonModule,
    NgbTooltipModule,
    IconGanttComponent,
    IconGroupComponent,
    IconOrderComponent,
    IconTimeScheduleComponent,
    IconClientsComponent,
    IconChartComponent,
    IconUserComponent,
    IconSettingComponent,
  ],
})
export class NavComponent implements OnInit, AfterViewInit {
  public authorizationService = inject(AuthorizationService);
  private navigationService = inject(NavigationService);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profileImage: any;

  absence = MessageLibrary.ABSENCE;
  all_schedule = MessageLibrary.ALL_SCHEDULE;
  all_employee = MessageLibrary.ALL_EMPLOYEE;
  all_group = MessageLibrary.ALL_GROUP;
  all_shift = MessageLibrary.ALL_SHIFT;
  statistic = MessageLibrary.STATISTIC;

  constructor(
    @Inject(Router) private router: Router,
    @Inject(DataLoadFileService)
    public dataLoadFileService: DataLoadFileService,
    private translateService: TranslateService,
    private translateStringConstantsService: TranslateStringConstantsService,
    private localStorageService: LocalStorageService,
    private localeService: LocaleService
  ) {}

  ngOnInit(): void {
    this.translateService.setDefaultLang(MessageLibrary.DEFAULT_LANG);

    const lang =
      this.localStorageService.get(MessageLibrary.CURRENT_LANG) !== null;

    if (lang) {
      this.onChangeLanguage(
        this.localStorageService.get(MessageLibrary.CURRENT_LANG) as string
      );
    }
    this.tryLoadProfileImage();

    this.absence = MessageLibrary.ABSENCE;
    this.all_schedule = MessageLibrary.ALL_SCHEDULE;
    this.all_employee = MessageLibrary.ALL_EMPLOYEE;
    this.statistic = MessageLibrary.STATISTIC;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange.subscribe(() => {
      setTimeout(() => {
        this.absence = MessageLibrary.ABSENCE;
        this.all_schedule = MessageLibrary.ALL_SCHEDULE;
        this.all_employee = MessageLibrary.ALL_EMPLOYEE;
        this.statistic = MessageLibrary.STATISTIC;
      }, 200);
    });
  }

  onClickAbsence(): void {
    this.navigationService.navigateToAbsence();
  }

  onClickGroup(): void {
    this.navigationService.navigateToGroup();
  }

  onClickShift(): void {
    this.navigationService.navigateToShift();
  }

  onClickSchedule(): void {
    this.navigationService.navigateToSchedule();
  }

  onClickClients(): void {
    this.navigationService.navigateToClient();
  }

  onClickProviders(): void {}

  onClickProfile(): void {
    this.navigationService.navigateToProfile();
  }

  onClickSettings(): void {
    this.navigationService.navigateToSettings();
  }

  onClickStatistic(): void {
    this.navigationService.navigateToStatistic();
  }

  private tryLoadProfileImage() {
    const id = localStorage.getItem(MessageLibrary.TOKEN_USERID);

    if (id) {
      const imgId = `${id}profile`;

      this.dataLoadFileService.downLoadFile(imgId);
    }
  }

  onChangeLanguage(lang: string) {
    this.translateService.use(lang);
    localStorage.setItem(MessageLibrary.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    this.localeService.setLocale(lang as SupportedLocales);
  }
}
