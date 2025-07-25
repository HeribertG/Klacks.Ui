import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';

// Angular und Bibliotheksmodule
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// Anwendungskomponenten
import { ProfilePictureComponent } from '../profile-picture/profile-picture.component';
import { ProfileDataEditComponent } from '../profile-data-edit/profile-data-edit.component';
import { ProfileCustomSettingComponent } from '../profile-custom-setting/profile-custom-setting.component';

// Services
import { DataManagementProfileService } from 'src/app/data/management/data-management-profile.service';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';

@Component({
  selector: 'app-profile-home',
  templateUrl: './profile-home.component.html',
  styleUrls: ['./profile-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ProfilePictureComponent,
    ProfileDataEditComponent,
    ProfileCustomSettingComponent,
  ],
})
export class ProfileHomeComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();

  public translate = inject(TranslateService);
  private workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementProfileService = inject(DataManagementProfileService);
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    
    // Hide search for profile pages
    this.searchService.setSearchVisibility(false);
    
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('profile');
    
    // Show footer for this profile page
    this.footerService.setFooterVisibility(true);
    
    this.dataManagementProfileService.readData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any): void {
    this.isChangingEvent.emit(event);
    
    // Forward to WorkplaceStateService to update footer buttons
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }
}
