import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-settings-home',
  templateUrl: './settings-home.component.html',
  styleUrls: ['./settings-home.component.scss'],
  standalone: false,
})
export class SettingsHomeComponent implements OnInit {
  @Input() isSetting: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
  constructor(
    @Inject(DataManagementSwitchboardService)
    public dataManagementSwitchboardService: DataManagementSwitchboardService,
    @Inject(DataManagementSettingsService)
    public dataManagementSettingsService: DataManagementSettingsService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID) + '';
    this.dataManagementSettingsService.CurrentAccountId = id;
    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementSettingsService';
    this.dataManagementSettingsService.readData();
  }

  onIsChanging(event: any): void {
    this.isChangingEvent.emit(event);
  }

  isfocused(value: string) {}
}
