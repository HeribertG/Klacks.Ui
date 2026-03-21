// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';

import { IContract, Contract } from 'src/app/domain/models/contract/contract-class';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-contract-row',
  templateUrl: './contract-row.component.html',
  styleUrls: ['./contract-row.component.scss'],
  standalone: true,
  imports: [TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractRowComponent {
  @Input() data: IContract = new Contract();
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() editEvent = new EventEmitter<IContract>();

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }
}
