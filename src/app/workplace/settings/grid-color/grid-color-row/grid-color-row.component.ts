import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ISetting } from 'src/app/core/settings-various-class';
import { GridColorService } from 'src/app/grid/services/grid-color.service';

@Component({
  selector: 'app-grid-color-row',
  templateUrl: './grid-color-row.component.html',
  styleUrls: ['./grid-color-row.component.scss'],
})
export class GridColorRowComponent implements OnInit {
  @Input() data: ISetting | undefined;

  @Output() isChangingEvent = new EventEmitter<true>();

  zone: any;

  constructor(private gridColorService: GridColorService) {}

  ngOnInit(): void {}

  onChange(event: any) {
    if (this.data) {
      this.data.value = event.target.value;
    }
    this.isChangingEvent.emit(true);
  }
}
