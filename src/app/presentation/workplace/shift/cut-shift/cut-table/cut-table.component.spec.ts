// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CutTableComponent } from './cut-table.component';

describe('CutTableComponent', () => {
  let component: CutTableComponent;
  let fixture: ComponentFixture<CutTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CutTableComponent, TranslateModule.forRoot()],
      providers: [TranslateService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CutTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
