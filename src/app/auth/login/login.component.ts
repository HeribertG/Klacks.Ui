import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { NavigationService } from 'src/app/services/navigation.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    FontAwesomeModule,
  ],
})
export class LoginComponent implements OnInit, AfterViewInit {
  public isClicked = false;
  public username = '';
  public password = '';
  public token = '';
  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public showPassword = false;
  public currentLang = MessageLibrary.CURRENT_LANG;

  private auth = inject(AuthService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);
  private authorizationService = inject(AuthorizationService);

  ngOnInit(): void {
    this.translateService.setDefaultLang(MessageLibrary.DEFAULT_LANG);

    const lang =
      this.localStorageService.get(MessageLibrary.CURRENT_LANG) !== null;

    if (lang) {
      this.translateService.use(
        this.localStorageService.get(MessageLibrary.CURRENT_LANG) as string
      );
    }
  }

  async ngAfterViewInit(): Promise<void> {
    await this.auth.checkIfTokenIsValid();
  }

  async onSave(): Promise<void> {
    this.isClicked = true;

    if (await this.auth.logIn(this.username, this.password)) {
      this.navigationService.navigateToWorkplace();
      this.isClicked = false;
    } else {
      this.isClicked = false;
    }
    this.authorizationService.refresh();
  }
}
