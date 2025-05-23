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
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

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
  @Input() isProfile = false;

  public translate = inject(TranslateService);
  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  public dataManagementProfileService = inject(DataManagementProfileService);

  ngOnInit(): void {
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementProfileService';
    this.dataManagementProfileService.readData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any): void {
    this.isChangingEvent.emit(event);
  }
}
