import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IState } from 'src/app/core/client-class';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
    selector: 'app-state-row',
    templateUrl: './state-row.component.html',
    styleUrls: ['./state-row.component.scss'],
    standalone: false
})
export class StateRowComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() data: IState | undefined;

  @Output() isChangingEvent = new EventEmitter<true>();
  @Output() isDeleteEvent = new EventEmitter();

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    private zone: NgZone,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickDelete() {
    this.isDeleteEvent.emit();
  }

  onChange(event: any) {
    this.zone.runOutsideAngular(() => {
      if (this.data) {
        if (
          this.data!.isDirty === undefined ||
          this.data!.isDirty === CreateEntriesEnum.undefined
        ) {
          this.data!.isDirty = CreateEntriesEnum.rewrite;
        }
      }

      this.isChangingEvent.emit(true);
    });
  }

  onKeyUp(event: any) {
    this.zone.runOutsideAngular(() => {
      if (this.data) {
        if (
          this.data.isDirty === undefined ||
          this.data.isDirty === CreateEntriesEnum.undefined
        ) {
          this.data.isDirty = CreateEntriesEnum.rewrite;
        }
      }

      this.isChangingEvent.emit(true);
    });
  }
}
