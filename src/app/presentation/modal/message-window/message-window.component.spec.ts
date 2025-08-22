import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MessageWindowComponent } from './message-window.component';
import { QuestionMarkRoundComponent } from 'src/app/presentation/icons/icon-round-question_mark.component';

describe('MessageWindowComponent', () => {
  let component: MessageWindowComponent;
  let fixture: ComponentFixture<MessageWindowComponent>;
  let translateService: jasmine.SpyObj<TranslateService>;

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
    translateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    // Setup spy for get method
    spyOn(translateService, 'get').and.returnValue(of('Test Message'));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default values', () => {
    expect(component.title).toBe('Message');
    expect(component.message).toBe('');
  });

  it('should translate title on ngOnInit', () => {
    const translatedTitle = 'Nachricht';
    translateService.get.and.returnValue(of(translatedTitle));

    component.ngOnInit();

    expect(translateService.get).toHaveBeenCalledWith('message');
    expect(component.title).toBe(translatedTitle);
  });

  it('should accept custom title input', () => {
    const customTitle = 'Custom Message Title';

    // Set title before ngOnInit runs, or after and then trigger change detection
    component.title = customTitle;

    // Need to call ngOnInit again or override the translation
    translateService.get.and.returnValue(of(customTitle));
    component.ngOnInit();

    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector('#modal-title');
    expect(titleElement.textContent.trim()).toBe(customTitle);
  });

  it('should accept custom message input', () => {
    const customMessage = 'This is a test message';
    component.message = customMessage;
    fixture.detectChanges();

    const modalBody = fixture.nativeElement.querySelector('.modal-body');
    expect(modalBody.textContent.trim()).toContain(customMessage);
  });

  it('should display question mark icon', () => {
    fixture.detectChanges();

    const questionIcon = fixture.nativeElement.querySelector(
      'app-icon-round-question-mark'
    );
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
    const testTitle = 'Test Message Title';
    const testMessage = 'Test message content';

    // Set the message first
    component.message = testMessage;

    // Override translation to return our test title
    translateService.get.and.returnValue(of(testTitle));
    component.ngOnInit();

    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('#modal-title').textContent).toContain(
      testTitle
    );
    expect(compiled.querySelector('.modal-body').textContent).toContain(
      testMessage
    );
  });

  it('should update title after translation in ngOnInit even with initial custom title', () => {
    const initialTitle = 'Initial Title';
    const translatedTitle = 'Übersetzter Titel';

    component.title = initialTitle;
    translateService.get.and.returnValue(of(translatedTitle));

    component.ngOnInit();

    expect(component.title).toBe(translatedTitle);
  });
});
