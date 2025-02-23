import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

@Component({
    selector: 'app-edit-address-home',
    templateUrl: './edit-address-home.component.html',
    styleUrls: ['./edit-address-home.component.scss'],
    standalone: false
})
export class EditAddressHomeComponent implements OnInit {
  @Input() isEditClient = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isEnterEvent = new EventEmitter();

  @HostListener('keyup', ['$event']) onkeyup(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.dataManagementClientService.areObjectsDirty()) {
        this.isEnterEvent.emit();
      }
    }
  }

  constructor(
    public dataManagementSwitchboardService: DataManagementSwitchboardService,
    public dataManagementClientService: DataManagementClientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.dataManagementClientService.editClient === undefined) {
      const tmpUrl = this.router.url;
      const res = tmpUrl.replace('?id=', ';').split(';');
      if (res.length === 2 && res[0] === '/workplace/edit-address') {
        this.dataManagementClientService.readClient(res[1]);
        return;
      } else {
        this.dataManagementClientService.createClient();
      }
    }

    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementClientService_Edit';
  }

  onIsChanging(event: boolean) {
    this.isChangingEvent.emit(event);
  }
}
