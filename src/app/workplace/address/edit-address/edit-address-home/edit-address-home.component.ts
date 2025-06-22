import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { EditAddressNavComponent } from '../edit-address-nav/edit-address-nav.component';
import { NoteComponent } from '../note/note.component';
import { MembershipComponent } from '../membership/membership.component';
import { AddressPersonaComponent } from '../address-persona/address-persona.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { UrlParameterService } from 'src/app/services/url-parameter.service';

@Component({
  selector: 'app-edit-address-home',
  templateUrl: './edit-address-home.component.html',
  styleUrls: ['./edit-address-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AddressPersonaComponent,
    MembershipComponent,
    NoteComponent,
    EditAddressNavComponent,
  ],
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

  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  public dataManagementClientService = inject(DataManagementClientService);
  public authorizationService = inject(AuthorizationService);
  private urlParameterService = inject(UrlParameterService);

  ngOnInit(): void {
    if (this.dataManagementClientService.editClient === undefined) {
      const result = this.urlParameterService.parseCurrentUrl(
        '/workplace/edit-address'
      );
      if (result.isValidRoute && result.hasId && result.id) {
        this.dataManagementClientService.readClient(result.id);
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
