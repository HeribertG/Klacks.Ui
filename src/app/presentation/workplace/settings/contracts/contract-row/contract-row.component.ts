import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IContract, Contract } from 'src/app/domain/models/contract-class';

@Component({
  selector: 'app-contract-row',
  templateUrl: './contract-row.component.html',
  styleUrls: ['./contract-row.component.scss'],
  standalone: true,
  imports: [CommonModule],
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
