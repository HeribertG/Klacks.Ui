import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';

@Component({
  selector: 'app-owner-address',
  templateUrl: './owner-address.component.html',
  styleUrls: ['./owner-address.component.scss'],
})
export class OwnerAddressComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();

  @ViewChild(NgForm, { static: false }) ownerAddressForm: NgForm | undefined;

  keyValueDiffers: any;
  objectForUnsubscribe: any;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementSettingsService: DataManagementSettingsService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.ownerAddressForm!.valueChanges!.subscribe(
      (x) => {
        if (this.ownerAddressForm!.dirty) {
          setTimeout(() => this.isChangingEvent.emit(true), 100);
        }
      }
    );

    this.dataManagementSettingsService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => this.isChangingEvent.emit(false), 100);
      });
  }

  ngOnDestroy(): void {
    this.objectForUnsubscribe.unsubscribe();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
