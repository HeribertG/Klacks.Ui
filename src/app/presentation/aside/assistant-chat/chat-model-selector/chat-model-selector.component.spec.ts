// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { ChatModelSelectorComponent } from './chat-model-selector.component';
import { ChatModelSelectionService } from '../services/chat-model-selection.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { IAssistantModel } from 'src/app/domain/models/assistant/assistant-model.interface';

describe('ChatModelSelectorComponent', () => {
    let fixture: ComponentFixture<ChatModelSelectorComponent>;
    let component: ChatModelSelectorComponent;
    let modelSelection: ChatModelSelectionService;
    let mockAssistantService: any;

    const models: IAssistantModel[] = [
        {
            id: '1',
            modelId: 'gpt-4',
            modelName: 'GPT-4',
            displayName: 'GPT-4',
            isEnabled: true,
            isDefault: true,
            costPerInputToken: 0.01,
            costPerOutputToken: 0.03,
            maxTokens: 8000,
            contextWindow: 32000,
            providerId: 'openai',
            capabilities: ['text'],
        } as IAssistantModel,
        {
            id: '2',
            modelId: 'gpt-3.5',
            modelName: 'GPT-3.5',
            displayName: 'GPT-3.5',
            isEnabled: true,
            isDefault: false,
            costPerInputToken: 0.001,
            costPerOutputToken: 0.002,
            maxTokens: 4000,
            contextWindow: 16000,
            providerId: 'openai',
            capabilities: ['text'],
        } as IAssistantModel,
    ];

    beforeEach(async () => {
        mockAssistantService = {
            availableModels: signal<IAssistantModel[]>(models),
            selectedModelId: signal('gpt-4'),
            modelsInitialized: signal(true),
            setCurrentModel: vi.fn(),
            warmupCache: vi.fn(),
            getModelInfo: vi.fn((id: string) => models.find((m) => m.modelId === id)),
        };

        await TestBed.configureTestingModule({
            imports: [ChatModelSelectorComponent, TranslateModule.forRoot()],
            providers: [
                ChatModelSelectionService,
                { provide: DataManagementAssistantService, useValue: mockAssistantService },
                {
                    provide: DataManagementAssistantProviderService,
                    useValue: { providersInitialized: signal(true), getCurrentProviders: vi.fn(() => []) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatModelSelectorComponent);
        component = fixture.componentInstance;
        modelSelection = TestBed.inject(ChatModelSelectionService);
        fixture.detectChanges();
    });

    it('should toggle model dropdown', () => {
        // Arrange
        component.showModelDropdown.set(false);

        // Act
        component.toggleModelDropdown();

        // Assert
        expect(component.showModelDropdown()).toBe(true);

        // Act
        component.toggleModelDropdown();

        // Assert
        expect(component.showModelDropdown()).toBe(false);
    });

    it('should select model', () => {
        // Arrange
        component.showModelDropdown.set(true);

        // Act
        component.selectModel('gpt-3.5');

        // Assert
        expect(mockAssistantService.setCurrentModel).toHaveBeenCalledWith('gpt-3.5');
        expect(modelSelection.currentModel()).toBe('gpt-3.5');
        expect(component.showModelDropdown()).toBe(false);
        expect(mockAssistantService.warmupCache).toHaveBeenCalled();
    });

    it('should get current model info', () => {
        // Arrange
        modelSelection.currentModel.set('gpt-4');

        // Act
        const result = component.getCurrentModelInfo();

        // Assert
        expect(mockAssistantService.getModelInfo).toHaveBeenCalledWith('gpt-4');
        expect(result).toEqual(models[0]);
    });

    it('should format cost correctly', () => {
        // Act & Assert
        expect(component.formatCost(0.01)).toBe('€0.0100/1K tokens');
        expect(component.formatCost(0.1234)).toBe('€0.1234/1K tokens');
    });

    it('closes the model dropdown on a click outside of it, but not on a click inside', () => {
        // Arrange
        component.showModelDropdown.set(true);
        fixture.detectChanges();
        const menu: HTMLElement = fixture.nativeElement.querySelector('.dropdown-menu');

        // Act
        menu.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Assert
        expect(component.showModelDropdown()).toBe(true);

        // Act
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Assert
        expect(component.showModelDropdown()).toBe(false);
    });

    it('selects a model from the dropdown and closes it', () => {
        // Arrange
        component.showModelDropdown.set(true);
        fixture.detectChanges();
        const items: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.dropdown-item'));

        // Act
        items[1].click();
        fixture.detectChanges();

        // Assert
        expect(mockAssistantService.setCurrentModel).toHaveBeenCalledWith('gpt-3.5');
        expect(component.showModelDropdown()).toBe(false);
        expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
    });
});
