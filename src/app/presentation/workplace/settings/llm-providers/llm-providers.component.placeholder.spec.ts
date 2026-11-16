// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ApplicationRef, EmbeddedViewRef, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { LLMProvidersComponent } from './llm-providers.component';
import { LLMProviderFormModel } from './llm-provider-form-model.interface';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IAssistantProvider } from 'src/app/domain/models/assistant/assistant-provider.interface';

const API_KEY_INPUT_SELECTOR = '#llm-providers-modal-api-key';
const NOT_REQUIRED_KEY = 'settings.llm-providers.api-key-not-required';
const TRANSLATION_LANGUAGE = 'de';
const NOT_REQUIRED_TEXT = 'Kein API-Schluessel noetig';
const EXAMPLE_PLACEHOLDER = 'sk-...';

const keylessProvider: IAssistantProvider = {
  id: '3',
  providerId: 'lm-studio',
  providerName: 'LM Studio',
  baseUrl: 'http://localhost:1234/v1/',
  apiVersion: '',
  isEnabled: true,
  priority: 10,
  hasApiKey: false,
  requiresApiKey: false,
};

function formModelOf(target: LLMProvidersComponent): WritableSignal<LLMProviderFormModel> {
  return (target as unknown as { formModel: WritableSignal<LLMProviderFormModel> }).formModel;
}

describe('LLMProvidersComponent API key placeholder', () => {
  let fixture: ComponentFixture<LLMProvidersComponent>;
  let component: LLMProvidersComponent;
  let view: EmbeddedViewRef<unknown>;

  const modalContext = { $implicit: { dismiss: vi.fn(), close: vi.fn() } };

  const apiKeyInput = (): HTMLInputElement =>
    view.rootNodes
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => node.querySelector<HTMLInputElement>(API_KEY_INPUT_SELECTOR))
      .find((input) => input !== null)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LLMProvidersComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementAssistantProviderService,
          useValue: {
            loadProviders: vi.fn().mockResolvedValue(undefined),
            getProviders: vi.fn().mockReturnValue(of([])),
            providers$: of([]),
            isLoading: signal(false),
            isDiscovering: signal(false),
          },
        },
        { provide: DataManagementAssistantService, useValue: { reloadModels: vi.fn(), getDefaultModel: vi.fn() } },
        { provide: ToastShowService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
        { provide: NgbModal, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LLMProvidersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.isNewProvider = false;
    component.editingProvider = { ...keylessProvider };
    formModelOf(component).set({
      providerId: keylessProvider.providerId,
      providerName: keylessProvider.providerName,
      baseUrl: keylessProvider.baseUrl ?? '',
      apiVersion: '',
      priority: '10',
      providerApiKey: '',
      isEnabled: true,
      requiresApiKey: false,
    });

    view = component.providerModal().createEmbeddedView(modalContext);
    TestBed.inject(ApplicationRef).attachView(view);
  });

  afterEach(() => {
    TestBed.inject(ApplicationRef).detachView(view);
    view.destroy();
  });

  it('shows the translated not-required placeholder once the translations arrive after the first render', () => {
    view.detectChanges();
    expect(apiKeyInput().placeholder).toBe(NOT_REQUIRED_KEY);

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(TRANSLATION_LANGUAGE, { [NOT_REQUIRED_KEY]: NOT_REQUIRED_TEXT });
    translate.use(TRANSLATION_LANGUAGE);
    view.detectChanges();

    expect(apiKeyInput().placeholder).toBe(NOT_REQUIRED_TEXT);
  });

  it('does not read the not-required placeholder through translate.instant', () => {
    const instant = vi.spyOn(TestBed.inject(TranslateService), 'instant');

    view.detectChanges();

    expect(instant).not.toHaveBeenCalledWith(NOT_REQUIRED_KEY);
  });

  it('keeps the literal example placeholder for providers that require an API key', () => {
    formModelOf(component).update((model) => ({ ...model, requiresApiKey: true }));
    component.isNewProvider = true;

    view.detectChanges();

    expect(apiKeyInput().placeholder).toBe(EXAMPLE_PLACEHOLDER);
  });
});
