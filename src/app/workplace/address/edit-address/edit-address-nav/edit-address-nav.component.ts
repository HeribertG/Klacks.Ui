import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IClient } from 'src/app/core/client-class';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
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
  public validFrom = MessageLibrary.VALID_FROM;
  public faCalendar = faCalendar;

  public dataManagementClientService = inject(DataManagementClientService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.validFrom = MessageLibrary.VALID_FROM;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.validFrom = MessageLibrary.VALID_FROM;
    }, 200);
  }

  onAddressTypeName(index: number): string {
    if (this.dataManagementClientService === undefined) {
      return '';
    }
    if (this.dataManagementClientService.editClient === undefined) {
      return '';
    }
    const type =
      +this.dataManagementClientService.editClient.addresses[index].type;

    let name = '';
    switch (type) {
      case 0:
        name = MessageLibrary.ADDRES_TYPE0_NAME;
        break;
      case 1:
        name = MessageLibrary.ADDRES_TYPE1_NAME;
        break;
      case 2:
        name = MessageLibrary.ADDRES_TYPE2_NAME;
        break;
      default:
        name = MessageLibrary.ADDRES_TYPE_UNDEFINED;
    }

    if (
      this.dataManagementClientService.editClient.addresses[index].id ===
        null ||
      this.dataManagementClientService.editClient.addresses[index].id === ''
    ) {
      name = name + ' (neu)';
    }
    return name;
  }

  onClickAddressArray(index: number) {
    this.dataManagementClientService.currentAddressIndex = index;
  }

  onClickPaginationButton(changeValue: number) {
    if (changeValue < 0) {
      if (this.dataManagementClientService.findClientPage > 1) {
        this.dataManagementClientService.findClientPage += changeValue;
        this.dataManagementClientService.readActualSortedClientPage();
      }
    } else if (changeValue > 0) {
      if (
        this.dataManagementClientService.findClientPage <
        this.dataManagementClientService.findClientMaxPages
      ) {
        this.dataManagementClientService.findClientPage += changeValue;
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
    if (this.dataManagementClientService.backupFindClient) {
      return true;
    }
    return false;
  }
}
