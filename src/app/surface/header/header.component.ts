import { Component, inject, Inject, OnChanges, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false,
})
export class HeaderComponent implements OnInit, OnChanges {
  public dataLoadFileService = inject(DataLoadFileService);

  private navigationService = inject(NavigationService);
  private auth = inject(AuthService);

  private localStorageService = inject(LocalStorageService);

  public registerDropdown: HTMLDivElement | undefined;
  public selectedName = 'new-address';
  public authorised = false;
  public version = '';
  public searchString = '';

  public ImageName = 'ok-symbol.png';

  ngOnInit(): void {
    this.setTheme();
  }

  ngOnChanges(changes: any) {
    this.setTheme();
  }

  onClickDashboard(): void {
    this.navigationService.navigateToDashboard();
  }

  onClickLogOut(): void {
    this.auth.logOut();
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
