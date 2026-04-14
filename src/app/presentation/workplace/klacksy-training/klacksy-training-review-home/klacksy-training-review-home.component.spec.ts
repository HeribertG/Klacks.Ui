// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingReviewHomeComponent } from './klacksy-training-review-home.component';

describe('KlacksyTrainingReviewHomeComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingReviewHomeComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [KlacksyTrainingReviewHomeComponent, TranslateModule.forRoot()]
    });
    fixture = TestBed.createComponent(KlacksyTrainingReviewHomeComponent);
  });

  it('switches tab when button clicked', () => {
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.tabs button');
    buttons[1].click();
    fixture.detectChanges();
    expect(buttons[1].classList.contains('active')).toBe(true);
  });
});
