/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { GroupSelectComponent } from 'src/app/group-select/group-select.component';
import { IconSignOutComponent } from 'src/app/icons/icon-sign-out.component';
import { SearchComponent } from 'src/app/search/search.component';
import { NavigationService } from 'src/app/services/navigation.service';
import { ThemeService } from 'src/app/services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SearchComponent,
    GroupSelectComponent,
    IconSignOutComponent,
  ],
})
export class HeaderComponent implements AfterViewInit {
  public dataLoadFileService = inject(DataLoadFileService);

  private navigationService = inject(NavigationService);
  private auth = inject(AuthService);
  private themeService = inject(ThemeService);

  public registerDropdown: HTMLDivElement | undefined;
  public selectedName = 'new-address';
  public authorised = false;
  public version = '';
  public searchString = '';

  public ImageName = 'ok-symbol.png';

  ngAfterViewInit(): void {
    this.setTheme();
    this.themeService.theme$.subscribe(() => {
      this.setTheme();
    });
  }

  onClickDashboard(): void {
    this.navigationService.navigateToDashboard();
  }

  onClickLogOut(): void {
    this.auth.logOut();
  }

  private setTheme(): void {
    const currentTheme = this.themeService.getCurrentTheme();
    this.ImageName =
      currentTheme === 'dark' ? 'ok-symbol dark.png' : 'ok-symbol.png';
  }
}
