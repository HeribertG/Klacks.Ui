// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Phones, emails and, for a person on the main address, the birthdate of the address persona card.
 * @param isMainAddress - Whether the current address is the main address of the client
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AddressPersonaCommunicationService } from '../services/address-persona-communication.service';
import { AddressPersonaStateService } from '../services/address-persona-state.service';

@Component({
  selector: 'app-address-persona-communications',
  templateUrl: './address-persona-communications.component.html',
  styleUrls: ['./address-persona-communications.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbDatepickerModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaCommunicationsComponent {
  readonly isMainAddress = input.required<boolean>();

  protected readonly dataManagementClientService = inject(DataManagementClientService);
  protected readonly state = inject(AddressPersonaStateService);
  protected readonly communication = inject(AddressPersonaCommunicationService);
  protected readonly faCalendar = faCalendar;

  protected isLegalEntity(): boolean {
    return this.state.isLegalEntity();
  }
}
