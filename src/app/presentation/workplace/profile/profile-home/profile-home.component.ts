// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Container component for the user profile page, orchestrating picture, password, settings, and microphone sub-cards.
 */

import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { ProfilePictureComponent } from '../profile-picture/profile-picture.component';
import { ProfileDataEditComponent } from '../profile-data-edit/profile-data-edit.component';
import { ProfileCustomSettingComponent } from '../profile-custom-setting/profile-custom-setting.component';
import { ProfileMicrophoneTestComponent } from '../profile-microphone-test/profile-microphone-test.component';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHomeComponent implements OnInit {

  private workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementProfileService = inject(DataManagementProfileService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('profile');
    this.savebarService.setSavebarVisibility(true);
    this.dataManagementProfileService.readData();
  }

  onIsChanging(event: boolean): void {
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }
}
