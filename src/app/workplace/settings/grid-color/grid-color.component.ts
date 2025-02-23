import {
  Component,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { GridColorService } from 'src/app/grid/services/grid-color.service';

@Component({
    selector: 'app-grid-color',
    templateUrl: './grid-color.component.html',
    styleUrls: ['./grid-color.component.scss'],
    standalone: false
})
export class GridColorComponent implements OnInit, OnChanges {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  constructor(public gridColorService: GridColorService) {}

  ngOnInit(): void {
    this.gridColorService.readData();
  }

  ngOnChanges(changes: SimpleChanges): void {}

  onIsChanging(value: any) {
    this.isChangingEvent.emit(value);
  }
}
