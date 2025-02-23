import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { deleteStack } from 'src/app/helpers/local-storage-stack';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import {
  LocaleService,
  SupportedLocales,
} from 'src/app/services/locale.service';
import { TranslateStringConstantsService } from 'src/app/translate/translate-string-constants.service';

@Component({
    selector: 'app-nav',
    templateUrl: './nav.component.html',
    styleUrls: ['./nav.component.scss'],
    standalone: false
})
export class NavComponent implements OnInit, AfterViewInit {
  profileImage: any;
  isAdmin = false;
  authorised = false;

  absence = MessageLibrary.ABSENCE;
  all_schedule = MessageLibrary.ALL_SCHEDULE;
  all_employee = MessageLibrary.ALL_EMPLOYEE;
  all_group = MessageLibrary.ALL_GROUP;
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
    if (this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)) {
      this.isAdmin = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)!
      );
    }
    if (this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)) {
      this.authorised = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_AUTHORISED)!
      );
    }

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
    this.router.navigate(['/workplace/absence']);
  }

  onClickGroup(): void {
    this.router.navigate(['/workplace/group']);
  }

  onClickSchedule(): void {
    this.router.navigate(['/workplace/schedule']);
  }

  onClickClients(): void {
    deleteStack();
    this.router.navigate(['/workplace/client']);
  }

  onClickProviders(): void {}

  onClickProfile(): void {
    deleteStack();
    this.router.navigate(['/workplace/profile']);
  }
  onClickSettings(): void {
    deleteStack();
    this.router.navigate(['/workplace/settings']);
  }

  onClickStatistic(): void {}

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
