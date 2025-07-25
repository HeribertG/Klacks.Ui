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
  public workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementProfileService = inject(DataManagementProfileService);

  ngOnInit(): void {
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('profile');
    this.dataManagementProfileService.readData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any): void {
    this.isChangingEvent.emit(event);
  }
}
