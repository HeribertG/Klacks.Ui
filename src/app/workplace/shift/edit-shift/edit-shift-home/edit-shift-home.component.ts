import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-edit-shift-home',
  templateUrl: './edit-shift-home.component.html',
  styleUrls: ['./edit-shift-home.component.scss'],
})
export class EditShiftHomeComponent implements OnInit {
  @Input() isCreateShift = false;
  @Output() isChangingEvent = new EventEmitter();

  isComplex = false;

  constructor(
    public dataManagementSwitchboardService: DataManagementSwitchboardService,
    public dataManagementShiftService: DataManagementShiftService,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {}
  ngOnInit(): void {
    this.onIsChangingMode();

    this.dataManagementShiftService.init();

    if (this.dataManagementShiftService.editShift === undefined) {
      const tmpUrl = this.router.url;
      const res = tmpUrl.replace('?id=', ';').split(';');
      if (res.length === 2 && res[0] === '/workplace/edit-shift') {
        this.dataManagementShiftService.readShift(res[1]);
        return;
      } else {
        this.dataManagementShiftService.createShift();
      }
    }

    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementShiftService_Edit';
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }

  onIsChangingMode(): void {
    const currentMode = this.localStorageService.get('mode')
      ? this.localStorageService.get('mode')
      : null;

    this.isComplex = currentMode === 'complex' ? true : false;
  }
}
