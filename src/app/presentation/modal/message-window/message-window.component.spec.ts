// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { MessageWindowComponent } from './message-window.component';
import { QuestionMarkRoundComponent } from 'src/app/presentation/icons/icon-round-question_mark.component';

describe('MessageWindowComponent', () => {
    let component: MessageWindowComponent;
    let fixture: ComponentFixture<MessageWindowComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                MessageWindowComponent,
                TranslateModule.forRoot(),
                QuestionMarkRoundComponent,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(MessageWindowComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default values', () => {
        expect(component.title()).toBe('message');
        expect(component.message()).toBe('');
    });

    it('should accept custom message input', () => {
        const customMessage = 'This is a test message';
        fixture.componentRef.setInput('message', customMessage);
        fixture.detectChanges();

        const modalBody = fixture.nativeElement.querySelector('.modal-body');
        expect(modalBody.textContent.trim()).toContain(customMessage);
    });

    it('should display question mark icon', () => {
        fixture.detectChanges();

        const questionIcon = fixture.nativeElement.querySelector('app-icon-round-question-mark');
        expect(questionIcon).toBeTruthy();
    });

    it('should have proper CSS classes', () => {
        fixture.detectChanges();

        const headerElement = fixture.nativeElement.querySelector('.modal-header');
        const bodyElement = fixture.nativeElement.querySelector('.modal-body');

        expect(headerElement).toBeTruthy();
        expect(bodyElement).toBeTruthy();
        expect(bodyElement.classList.contains('row-line-modal')).toBe(true);
    });

    it('should render template correctly with inputs', () => {
        const testMessage = 'Test message content';

        fixture.componentRef.setInput('message', testMessage);
        fixture.detectChanges();

        const compiled = fixture.nativeElement;
        expect(compiled.querySelector('.modal-body').textContent).toContain(testMessage);
    });
});
