import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { DataManagementProfileService } from 'src/app/data/management/data-management-profile.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ProfilePictureComponent } from '../profile-picture/profile-picture.component';
import { ProfileDataEditComponent } from '../profile-data-edit/profile-data-edit.component';
import { ProfileCustomSettingComponent } from '../profile-custom-setting/profile-custom-setting.component';

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
  @Input() isProfile: boolean = false;

  constructor(
    @Inject(DataManagementSwitchboardService)
    public dataManagementSwitchboardService: DataManagementSwitchboardService,
    @Inject(DataManagementProfileService)
    public dataManagementProfileService: DataManagementProfileService
  ) {}

  ngOnInit(): void {
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementProfileService';
    this.dataManagementProfileService.readData();
  }
  onIsChanging(event: any): void {
    this.isChangingEvent.emit(event);
  }
}
