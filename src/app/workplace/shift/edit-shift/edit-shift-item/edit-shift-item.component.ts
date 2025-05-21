import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-edit-shift-item',
  templateUrl: './edit-shift-item.component.html',
  styleUrls: ['./edit-shift-item.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
    FontAwesomeModule,
    NgbDatepickerModule,
  ],
})
export class EditShiftItemComponent implements AfterViewInit, OnDestroy {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  @Output() isChangingMode = new EventEmitter();

  @ViewChild('mainShiftForm', { static: false }) mainShiftForm:
    | NgForm
    | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  private localStorageService = inject(LocalStorageService);

  public faCalendar = faCalendar;
  public visibleTable = 'inline';
  public isChecked = false;

  public objectForUnsubscribe: Subscription | undefined;

  ngAfterViewInit(): void {
    this.setMode();

    this.objectForUnsubscribe = this.mainShiftForm!.valueChanges!.subscribe(
      () => {
        if (this.mainShiftForm!.dirty === true) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  onComplexModeChecked(): void {
    if (this.isChecked) {
      this.localStorageService.set('mode', 'complex');
    } else {
      this.localStorageService.set('mode', 'simple');
    }

    if (!this.isChecked) {
      if (this.dataManagementShiftService.editShift) {
        this.dataManagementShiftService.editShift.isTimeRange = false;
      }
    }

    this.isChangingMode.emit();
  }

  setMode(): void {
    const currentMode = this.localStorageService.get('mode')
      ? this.localStorageService.get('mode')
      : null;

    this.isChecked = currentMode === 'complex' ? true : false;
  }
}
