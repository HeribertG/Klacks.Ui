import {
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

// Services
import { DataManagementSettingsService } from 'src/app/domain/services/data-management-settings.service';
import { WorkplaceStateService } from 'src/app/presentation/workplace/core/workplace-state.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { FooterService } from 'src/app/presentation/services/footer.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

// Standalone Komponenten
import { SettingsGeneralComponent } from '../settings-general/settings-general.component';
import { OwnerAddressComponent } from '../owner-address/owner-address.component';
import { CountriesComponent } from '../countries/countries.component';
import { StateComponent } from '../state/state.component';
import { AbsenceComponent } from '../absence/absence.component';
import { CalendarRulesComponent } from '../calendar-rules/calendar-rules.component';
import { EmailSettingComponent } from '../email-setting/email-setting.component';
import { GridColorComponent } from '../grid-color/grid-color.component';
import { MacrosComponent } from '../macros/macros.component';
import { UserAdministrationComponent } from '../user-administration/user-administration.component';
import { GroupScopeComponent } from '../group-scope/group-scope.component';

@Component({
  selector: 'app-settings-home',
  templateUrl: './settings-home.component.html',
  styleUrls: ['./settings-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    SettingsGeneralComponent,
    OwnerAddressComponent,
    CountriesComponent,
    StateComponent,
    AbsenceComponent,
    CalendarRulesComponent,
    EmailSettingComponent,
    GridColorComponent,
    MacrosComponent,
    UserAdministrationComponent,
    GroupScopeComponent,
  ],
})
export class SettingsHomeComponent implements OnInit {

  public translate = inject(TranslateService);

  private workplaceStateService = inject(WorkplaceStateService);
  private dataManagementSettingsService = inject(DataManagementSettingsService);
  private localStorageService = inject(LocalStorageService);
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  get settingsService(): DataManagementSettingsService {
    return this.dataManagementSettingsService;
  }

  get switchboardService(): WorkplaceStateService {
    return this.workplaceStateService;
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();

    // Hide search for settings pages
    this.searchService.setSearchVisibility(false);

    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID) + '';
    this.dataManagementSettingsService.CurrentAccountId = id;
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('settings');
    this.footerService.setFooterVisibility(true);
    this.dataManagementSettingsService.readData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any): void {

    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isfocused(value: string): void {}
}
