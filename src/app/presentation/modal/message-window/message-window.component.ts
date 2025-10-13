import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuestionMarkRoundComponent } from 'src/app/presentation/icons/icon-round-question_mark.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-message-window',
  templateUrl: './message-window.component.html',
  styleUrls: ['./message-window.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, QuestionMarkRoundComponent],
})
export class MessageWindowComponent implements OnInit, OnDestroy {
  private translateService = inject(TranslateService);
  private destroy$ = new Subject<void>();

  @Input() title = 'Message';
  @Input() message = '';

  ngOnInit(): void {
    this.translateService.get('message')
      .pipe(takeUntil(this.destroy$))
      .subscribe((x) => {
        this.title = x;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
