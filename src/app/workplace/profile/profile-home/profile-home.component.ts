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

@Component({
  selector: 'app-profile-home',
  templateUrl: './profile-home.component.html',
  styleUrls: ['./profile-home.component.scss'],
})
export class ProfileHomeComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();
  @Input() isProfile: boolean | undefined;

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
