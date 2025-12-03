import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Component({
  selector: 'app-openroute',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './openroute.component.html',
  styleUrls: ['./openroute.component.scss'],
})
export class OpenrouteComponent implements OnInit {
  public translate = inject(TranslateService);
  private appSettingsManagementService = inject(AppSettingsManagementService);

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
