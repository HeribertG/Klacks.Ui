import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

// Angular und Bibliotheksmodule

import { TranslateModule, TranslateService } from '@ngx-translate/core';

// Anwendungskomponenten
import { ProfilePictureComponent } from '../profile-picture/profile-picture.component';
import { ProfileDataEditComponent } from '../profile-data-edit/profile-data-edit.component';
import { ProfileCustomSettingComponent } from '../profile-custom-setting/profile-custom-setting.component';
import { ProfileMicrophoneTestComponent } from '../profile-microphone-test/profile-microphone-test.component';

// Services
import { DataManagementProfileService } from 'src/app/domain/services/schedule/data-management-profile.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-profile-home',
  templateUrl: './profile-home.component.html',
  styleUrls: ['./profile-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ProfilePictureComponent,
    ProfileDataEditComponent,
    ProfileCustomSettingComponent,
    ProfileMicrophoneTestComponent
],
})
export class ProfileHomeComponent implements OnInit {

  public translate = inject(TranslateService);
  private workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementProfileService = inject(DataManagementProfileService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    
    // Hide search for profile pages
    this.searchService.setSearchVisibility(false);
    
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('profile');
    
    // Show footer for this profile page
    this.savebarService.setSavebarVisibility(true);
    
    this.dataManagementProfileService.readData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any): void {
    
    // Forward to WorkplaceStateService to update footer buttons
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }
}
