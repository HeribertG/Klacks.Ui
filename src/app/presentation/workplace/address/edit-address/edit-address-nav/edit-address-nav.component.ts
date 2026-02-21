import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IClient } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-address-nav',
  templateUrl: './edit-address-nav.component.html',
  styleUrls: ['./edit-address-nav.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgbTooltipModule],
})
export class EditAddressNavComponent implements OnInit, AfterViewInit {
  public validFrom = DomainMessages.VALID_FROM;
  public faCalendar = faCalendar;

  public dataManagementClientService = inject(DataManagementClientService);

  ngOnInit(): void {
    this.validFrom = DomainMessages.VALID_FROM;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.validFrom = DomainMessages.VALID_FROM;
    }, 200);
  }

  onAddressTypeName(index: number): string {
    if (this.dataManagementClientService === undefined) {
      return '';
    }
    if (this.dataManagementClientService.editClient() === undefined) {
      return '';
    }
    const type =
      +this.dataManagementClientService.editClient()!.addresses[index].type;

    let name = '';
    switch (type) {
      case 0:
        name = DomainMessages.ADDRES_TYPE0_NAME;
        break;
      case 1:
        name = DomainMessages.ADDRES_TYPE1_NAME;
        break;
      case 2:
        name = DomainMessages.ADDRES_TYPE2_NAME;
        break;
      default:
        name = DomainMessages.ADDRES_TYPE_UNDEFINED;
    }

    if (
      this.dataManagementClientService.editClient()!.addresses[index].id ===
        null ||
      this.dataManagementClientService.editClient()!.addresses[index].id === ''
    ) {
      name = name + ' (neu)';
    }
    return name;
  }

  onClickAddressArray(index: number) {
    this.dataManagementClientService.clientEditService.currentAddressIndex.set(index);
  }

  onClickPaginationButton(changeValue: number) {
    if (changeValue < 0) {
      if (this.dataManagementClientService.findClientPage() > 1) {
        this.dataManagementClientService.clientSearchService.findClientPage.update(page => page + changeValue);
        this.dataManagementClientService.readActualSortedClientPage();
      }
    } else if (changeValue > 0) {
      if (
        this.dataManagementClientService.findClientPage() <
        this.dataManagementClientService.findClientMaxPages()
      ) {
        this.dataManagementClientService.clientSearchService.findClientPage.update(page => page + changeValue);
        this.dataManagementClientService.readActualSortedClientPage();
      }
    }
  }

  onClickFindClient(value: IClient) {
    this.dataManagementClientService.replaceClient(value.id!);
  }

  onClickReset() {
    this.dataManagementClientService.resetFindClient();
  }

  isRestPossible(): boolean {
    return this.dataManagementClientService.clientSearchService.isResetPossible();
  }
}
