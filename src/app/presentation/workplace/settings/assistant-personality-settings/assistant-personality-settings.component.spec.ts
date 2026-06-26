// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AssistantPersonalitySettingsComponent } from './assistant-personality-settings.component';
import { DataAgentService } from 'src/app/infrastructure/api/assistant/data-agent.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

describe('AssistantPersonalitySettingsComponent (Signal Forms array)', () => {
  let component: AssistantPersonalitySettingsComponent;
  let fixture: ComponentFixture<AssistantPersonalitySettingsComponent>;
  let mockDataAgent: Partial<Record<keyof DataAgentService, ReturnType<typeof vi.fn>>>;
  let mockToast: Partial<Record<keyof ToastShowService, ReturnType<typeof vi.fn>>>;

  beforeEach(async () => {
    mockDataAgent = {
      getAll: vi.fn().mockReturnValue(of([{ id: 'agent-1', isDefault: true }])),
      getSoulSections: vi.fn().mockReturnValue(
        of([{ sectionType: 'identity', content: 'Loaded identity', isActive: true }]),
      ),
      upsertSoulSection: vi
        .fn()
        .mockReturnValue(of({ agentId: 'agent-1', sectionType: 'identity' })),
    };
    mockToast = { showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AssistantPersonalitySettingsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataAgentService, useValue: mockDataAgent },
        { provide: ToastShowService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantPersonalitySettingsComponent);
    component = fixture.componentInstance;
  });

  it('creates and renders the form array', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const textareas = fixture.nativeElement.querySelectorAll('textarea');
    expect(textareas.length).toBe(6);
  });

  it('loads soul sections into the form model on init', async () => {
    await component.ngOnInit();
    const identity = component.fields()[0];
    expect(identity.key).toBe('identity');
    expect(identity.content).toBe('Loaded identity');
    expect(identity.initialContent).toBe('Loaded identity');
  });

  it('reflects a form edit in the model and preserves sibling fields', async () => {
    await component.ngOnInit();
    const form = component['personalityForm'] as any;
    form[0].content().value.set('Edited identity');

    const identity = component.fields()[0];
    // (a) model reflects the edit
    expect(identity.content).toBe('Edited identity');
    // (b) unbound sibling fields survive the immutable update
    expect(identity.key).toBe('identity');
    expect(identity.labelKey).toBe('setting.personality.identity');
    expect(identity.hintKey).toBe('setting.personality.identity-hint');
    expect(identity.initialContent).toBe('Loaded identity');
  });

  it('sends the edited content to upsertSoulSection on blur', async () => {
    await component.ngOnInit();
    const form = component['personalityForm'] as any;
    form[0].content().value.set('Edited identity');

    await component.onFieldBlur(0);

    // (c) save payload carries the new value, read from the model by index
    expect(mockDataAgent.upsertSoulSection).toHaveBeenCalledWith('agent-1', 'identity', {
      content: 'Edited identity',
    });
    // dirty baseline advances so a second blur is a no-op
    expect(component.fields()[0].initialContent).toBe('Edited identity');
  });

  it('does not persist when the field content is unchanged', async () => {
    await component.ngOnInit();
    (mockDataAgent.upsertSoulSection as ReturnType<typeof vi.fn>).mockClear();

    await component.onFieldBlur(1);

    expect(mockDataAgent.upsertSoulSection).not.toHaveBeenCalled();
  });
});
