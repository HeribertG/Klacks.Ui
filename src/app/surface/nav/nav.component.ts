/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
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
import { ThemeService } from 'src/app/services/theme.service';
import { UrlParameterService } from 'src/app/services/url-parameter.service';
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
  @ViewChild('absenceIcon') absenceIcon!: IconGanttComponent;
  @ViewChild('groupIcon') groupIcon!: IconGroupComponent;
  @ViewChild('shiftIcon') shiftIcon!: IconOrderComponent;
  @ViewChild('scheduleIcon') scheduleIcon!: IconTimeScheduleComponent;
  @ViewChild('employeesIcon') employeesIcon!: IconClientsComponent;
  @ViewChild('userIcon') userIcon!: IconUserComponent;
  @ViewChild('settingsIcon') settingsIcon!: IconSettingComponent;

  public authorizationService = inject(AuthorizationService);
  public router = inject(Router);
  public dataLoadFileService = inject(DataLoadFileService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private translateStringConstantsService = inject(
    TranslateStringConstantsService
  );
  private localStorageService = inject(LocalStorageService);
  private localeService = inject(LocaleService);
  private themeService = inject(ThemeService);
  private urlParameterService = inject(UrlParameterService);

  profileImage: any;

  absence = MessageLibrary.ABSENCE;
  all_schedule = MessageLibrary.ALL_SCHEDULE;
  all_employee = MessageLibrary.ALL_EMPLOYEE;
  all_group = MessageLibrary.ALL_GROUP;
  all_shift = MessageLibrary.ALL_SHIFT;
  statistic = MessageLibrary.STATISTIC;

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

    this.resetIconColor();

    const page = this.urlParameterService.getWorkplaceSubRoute();
    this.setSelectedIconColor(page);

    this.themeService.theme$.subscribe(() => {
      this.resetIconColor();
      const page = this.urlParameterService.getWorkplaceSubRoute();
      this.setSelectedIconColor(page);
    });
  }

  onClickAbsence(): void {
    this.resetIconColor();
    this.absenceIcon.ChangeColor(true);
    this.navigationService.navigateToAbsence();
  }

  onClickGroup(): void {
    this.resetIconColor();
    this.groupIcon.ChangeColor(true);
    this.navigationService.navigateToGroup();
  }

  onClickShift(): void {
    this.resetIconColor();
    this.shiftIcon.ChangeColor(true);
    this.navigationService.navigateToShift();
  }

  onClickSchedule(): void {
    this.resetIconColor();
    this.scheduleIcon.ChangeColor(true);
    this.navigationService.navigateToSchedule();
  }

  onClickClients(): void {
    this.resetIconColor();
    this.employeesIcon.ChangeColor(true);
    this.navigationService.navigateToClient();
  }

  onClickProviders(): void {}

  onClickProfile(): void {
    this.resetIconColor();
    this.userIcon.ChangeColor(true);
    this.navigationService.navigateToProfile();
  }

  onClickSettings(): void {
    this.resetIconColor();
    this.settingsIcon.ChangeColor(true);
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

  private resetIconColor() {
    if (this.absenceIcon) {
      this.absenceIcon.ChangeColor();
    }
    if (this.groupIcon) {
      this.groupIcon.ChangeColor();
    }
    if (this.shiftIcon) {
      this.shiftIcon.ChangeColor();
    }
    if (this.scheduleIcon) {
      this.scheduleIcon.ChangeColor();
    }
    if (this.employeesIcon) {
      this.employeesIcon.ChangeColor();
    }
    if (this.userIcon) {
      this.userIcon.ChangeColor();
    }
    if (this.settingsIcon) {
      this.settingsIcon.ChangeColor();
    }
  }

  private setSelectedIconColor(page: string) {
    switch (page) {
      case 'client':
      case 'edit-address':
        this.employeesIcon.ChangeColor(true);
        break;
      case 'settings':
        this.settingsIcon.ChangeColor(true);
        break;

      case 'profile':
        this.userIcon.ChangeColor(true);
        break;
      case 'group':
      case 'edit-group':
        this.groupIcon.ChangeColor(true);
        break;
      case 'shift':
        this.shiftIcon.ChangeColor(true);
        break;
      case 'absence':
        this.absenceIcon.ChangeColor(true);
        break;
      case 'schedule':
        this.scheduleIcon.ChangeColor(true);
        break;
      default:
        return;
    }
  }
}
