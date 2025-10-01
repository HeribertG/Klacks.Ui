import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { WorkplaceStateService } from 'src/app/presentation/workplace/core/workplace-state.service';
import { EditAddressNavComponent } from '../edit-address-nav/edit-address-nav.component';
import { NoteComponent } from '../note/note.component';
import { MembershipComponent } from '../membership/membership.component';
import { AddressPersonaComponent } from '../address-persona/address-persona.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { FooterService } from 'src/app/presentation/services/footer.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

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
  @Output() isEnterEvent = new EventEmitter();

  @HostListener('keyup', ['$event']) onkeyup(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.dataManagementClientService.areObjectsDirty()) {
        this.isEnterEvent.emit();
      }
    }
  }

  private workplaceStateService = inject(WorkplaceStateService);
  public dataManagementClientService = inject(DataManagementClientService);
  public authorizationService = inject(AuthorizationService);
  private urlParameterService = inject(UrlParameterService);
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('edit-address');

    this.footerService.setFooterVisibility(true);

    if (this.dataManagementClientService.editClient() === undefined) {
      const result = this.urlParameterService.parseCurrentUrl(
        '/workplace/edit-address'
      );
      if (result.isValidRoute && result.hasId && result.id) {
        this.dataManagementClientService.readClient(result.id);
      } else {
        this.dataManagementClientService.createClient();
      }
    }
  }

  onIsChanging(event: boolean) {
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }
}
