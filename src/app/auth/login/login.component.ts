import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { TranslateService } from '@ngx-translate/core';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
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

  constructor(
    @Inject(AuthService) private auth: AuthService,
    @Inject(Router) private router: Router,
    @Inject(TranslateService) private translateService: TranslateService,
    @Inject(LocalStorageService)
    private localStorageService: LocalStorageService
  ) {}

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
    // Aufräumen
    this.destroyWorkRegistry();
    await this.auth.checkIfTokenIsValid();
  }

  async onSave(): Promise<void> {
    this.isClicked = true;

    if (await this.auth.logIn(this.username, this.password)) {
      this.router.navigate(['/workplace']);
      this.isClicked = false;
    } else {
      this.isClicked = false;
    }
  }

  private destroyWorkRegistry(): void {}
}
