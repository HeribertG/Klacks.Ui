import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Component({
  selector: 'app-openroute',
  standalone: true,
  imports: [FormsModule, TranslateModule, FontAwesomeModule],
  templateUrl: './openroute.component.html',
  styleUrls: ['./openroute.component.scss'],
})
export class OpenrouteComponent implements OnInit {
  public translate = inject(TranslateService);
  private appSettingsManagementService = inject(AppSettingsManagementService);

  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public showApiKey = false;

  ngOnInit(): void {
    this.appSettingsManagementService.loadSettings();
  }

  get openRouteServiceApiKey(): string {
    return this.appSettingsManagementService.openRouteServiceApiKey();
  }

  set openRouteServiceApiKey(value: string) {
    this.appSettingsManagementService.openRouteServiceApiKey.set(value);
  }
}
