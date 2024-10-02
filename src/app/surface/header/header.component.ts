import { Component, Inject, OnChanges, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { DataManagementSearchService } from 'src/app/data/management/data-management-search.service';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { TranslateStringConstantsService } from 'src/app/translate/translate-string-constants.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnChanges {
  public registerDropdown: HTMLDivElement | undefined;
  public selectedName = 'new-address';
  public authorised = false;
  public version = '';
  public searchString = '';

  ImageName = 'ok-symbol.png';

  constructor(
    @Inject(TranslateStringConstantsService)
    @Inject(Router)
    private router: Router,
    @Inject(DataLoadFileService)
    public dataLoadFileService: DataLoadFileService,
    public dataManagementClientService: DataManagementClientService,
    private auth: AuthService,
    private dataManagementSwitchboardService: DataManagementSwitchboardService,
    private dataManagementGroupService: DataManagementGroupService,
    private dataManagementShiftService: DataManagementShiftService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.setTheme();
  }

  ngOnChanges(changes: any) {
    this.setTheme();
  }

  onClickDashboard(): void {
    this.router.navigate(['/workplace/dashboard']);
  }

  onClickLogOut(): void {
    this.auth.logOut();
  }

  onClickDropdown(name: string) {
    this.selectedName = name;
    this.clickRegister();
  }

  onClickRegister() {
    this.clickRegister();
  }

  private clickRegister() {
    this.dataManagementSwitchboardService.reset();
    this.dataManagementSwitchboardService.isDisabled = false;
    this.dataManagementSwitchboardService.isDirty = false;

    switch (this.selectedName) {
      case 'new-address':
        this.dataManagementClientService.createClient();
        break;
      case 'new-group':
        this.dataManagementGroupService.createGroup();
        break;
      case 'new-work':
        this.dataManagementShiftService.createShift();
        break;
    }
  }

  setTheme(): void {
    const currentTheme = this.localStorageService.get('theme')
      ? this.localStorageService.get('theme')
      : null;
    if (currentTheme === 'dark') {
      this.ImageName = 'ok-symbol dark.png';
    }
  }
}
