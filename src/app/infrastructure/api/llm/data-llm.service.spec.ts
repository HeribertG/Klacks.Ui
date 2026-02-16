import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataLLMService, ILLMChatRequest, ILLMChatResponse, ILLMModel, ILLMUsage, ILLMFunction, ILLMHelp } from './data-llm.service';
import { environment } from 'src/environments/environment';

describe('DataLLMService', () => {
    let service: DataLLMService;
    let httpMock: HttpTestingController;
    let baseUrl: string;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [DataLLMService]
        });
        service = TestBed.inject(DataLLMService);
        httpMock = TestBed.inject(HttpTestingController);
        baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('chat', () => {
        it('should send chat request and return response', () => {
            // Arrange
            const request: ILLMChatRequest = {
                message: 'Hello AI',
                conversationId: 'conv-123',
                modelId: 'gpt-4'
            };
            const expectedResponse: ILLMChatResponse = {
                message: 'Hello human!',
                conversationId: 'conv-123',
                suggestions: ['How can I help?'],
                usage: {
                    inputTokens: 10,
                    outputTokens: 15,
                    totalTokens: 25,
                    cost: 0.001
                }
            };

            // Act
            service.chat(request).subscribe(response => {
                // Assert
                expect(response).toEqual(expectedResponse);
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}chat`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush(expectedResponse);
        });

        it('should retry on failure', async () => {
            // Arrange
            const request: ILLMChatRequest = { message: 'Hello' };

            // Act
            service.chat(request).subscribe({
                error: (error) => {
                    // Assert
                    expect(error).toBeDefined();
                    ;
                }
            });

            // Assert
            for (let i = 0; i < 4; i++) { // Initial request + 3 retries
                const req = httpMock.expectOne(`${baseUrl}chat`);
                req.error(new ProgressEvent('error'));
            }
        });
    });

    describe('getModels', () => {
        it('should fetch available models', () => {
            // Arrange
            const expectedModels: ILLMModel[] = [
                {
                    id: '1',
                    modelId: 'gpt-4',
                    modelName: 'GPT-4',
                    providerId: 'openai',
                    contextWindow: 32000,
                    maxTokens: 8000,
                    costPerInputToken: 0.01,
                    costPerOutputToken: 0.03,
                    isEnabled: true,
                    isDefault: true,
                    capabilities: ['text', 'function-calling']
                },
                {
                    id: '2',
                    modelId: 'claude-3',
                    modelName: 'Claude 3',
                    providerId: 'anthropic',
                    contextWindow: 200000,
                    maxTokens: 4000,
                    costPerInputToken: 0.008,
                    costPerOutputToken: 0.024,
                    isEnabled: false,
                    isDefault: false,
                    capabilities: ['text']
                }
            ];

            // Act
            service.getModels().subscribe(models => {
                // Assert
                expect(models).toEqual(expectedModels);
                expect(models.length).toBe(2);
                expect(models[0].modelId).toBe('gpt-4');
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models`);
            expect(req.request.method).toBe('GET');
            req.flush(expectedModels);
        });
    });

    describe('updateModel', () => {
        it('should update model configuration', () => {
            // Arrange
            const modelId = '1';
            const updates: Partial<ILLMModel> = {
                isEnabled: false,
                maxTokens: 4000
            };
            const expectedResponse: ILLMModel = {
                id: '1',
                modelId: 'gpt-4',
                modelName: 'GPT-4',
                providerId: 'openai',
                contextWindow: 32000,
                maxTokens: 4000,
                costPerInputToken: 0.01,
                costPerOutputToken: 0.03,
                isEnabled: false,
                isDefault: true,
                capabilities: ['text']
            };

            // Act
            service.updateModel(modelId, updates).subscribe(model => {
                // Assert
                expect(model).toEqual(expectedResponse);
                expect(model.isEnabled).toBe(false);
                expect(model.maxTokens).toBe(4000);
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models/${modelId}`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(updates);
            req.flush(expectedResponse);
        });
    });

    describe('model management', () => {
        it('should enable model', () => {
            // Arrange
            const modelId = 'gpt-4';

            // Act
            service.enableModel(modelId).subscribe(response => {
                // Assert
                expect(response).toBeTruthy();
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models/${modelId}/enable`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush({ success: true });
        });

        it('should disable model', () => {
            // Arrange
            const modelId = 'gpt-4';

            // Act
            service.disableModel(modelId).subscribe(response => {
                // Assert
                expect(response).toBeTruthy();
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models/${modelId}/disable`);
            expect(req.request.method).toBe('POST');
            req.flush({ success: true });
        });

        it('should set default model', () => {
            // Arrange
            const modelId = 'gpt-4';

            // Act
            service.setDefaultModel(modelId).subscribe(response => {
                // Assert
                expect(response).toBeTruthy();
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models/${modelId}/set-default`);
            expect(req.request.method).toBe('POST');
            req.flush({ success: true });
        });

        it('should create new model', () => {
            // Arrange
            const newModel: ILLMModel = {
                modelId: 'custom-model',
                modelName: 'Custom Model',
                providerId: 'custom',
                contextWindow: 16000,
                maxTokens: 2000,
                costPerInputToken: 0.005,
                costPerOutputToken: 0.015,
                isEnabled: true,
                isDefault: false,
                capabilities: ['text']
            };

            // Act
            service.createModel(newModel).subscribe(response => {
                // Assert
                expect(response.modelId).toBe('custom-model');
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(newModel);
            req.flush({ ...newModel, id: '3' });
        });

        it('should delete model', () => {
            // Arrange
            const modelId = '3';

            // Act
            service.deleteModel(modelId).subscribe(response => {
                // Assert
                expect(response).toBeTruthy();
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}models/${modelId}`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ success: true });
        });
    });

    describe('getUsage', () => {
        it('should fetch usage statistics with default days', () => {
            // Arrange
            const expectedUsage: ILLMUsage = {
                totalCost: 12.50,
                totalInputTokens: 50000,
                totalOutputTokens: 30000,
                conversationCount: 125,
                modelBreakdown: [
                    {
                        modelId: 'gpt-4',
                        displayName: 'GPT-4',
                        totalCost: 10.00,
                        usageCount: 100
                    },
                    {
                        modelId: 'gpt-3.5',
                        displayName: 'GPT-3.5',
                        totalCost: 2.50,
                        usageCount: 25
                    }
                ]
            };

            // Act
            service.getUsage().subscribe(usage => {
                // Assert
                expect(usage).toEqual(expectedUsage);
                expect(usage.totalCost).toBe(12.50);
                expect(usage.modelBreakdown.length).toBe(2);
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}usage?days=30`);
            expect(req.request.method).toBe('GET');
            req.flush(expectedUsage);
        });

        it('should fetch usage statistics with custom days', () => {
            // Arrange
            const days = 7;

            // Act
            service.getUsage(days).subscribe();

            // Assert
            const req = httpMock.expectOne(`${baseUrl}usage?days=7`);
            expect(req.request.method).toBe('GET');
            req.flush({});
        });
    });

    describe('getFunctions', () => {
        it('should fetch available functions', () => {
            // Arrange
            const expectedFunctions: ILLMFunction[] = [
                {
                    name: 'search_employees',
                    description: 'Search for clients in the database',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string' },
                            location: { type: 'string' }
                        }
                    },
                    isAvailable: true
                },
                {
                    name: 'create_employee',
                    description: 'Create a new employee record',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            email: { type: 'string' }
                        }
                    },
                    isAvailable: false
                }
            ];

            // Act
            service.getFunctions().subscribe(functions => {
                // Assert
                expect(functions).toEqual(expectedFunctions);
                expect(functions.length).toBe(2);
                expect(functions[0].name).toBe('search_employees');
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}chat/functions`);
            expect(req.request.method).toBe('GET');
            req.flush(expectedFunctions);
        });
    });

    describe('getHelp', () => {
        it('should fetch help information', () => {
            // Arrange
            const expectedHelp: ILLMHelp = {
                description: 'AI Assistant for Klacks application',
                examples: [
                    {
                        title: 'Client Management',
                        prompts: [
                            'Create a new client named John Doe',
                            'Search for clients in Zurich'
                        ]
                    },
                    {
                        title: 'Employee Management',
                        prompts: [
                            'Add employee Max Mustermann',
                            'Show me all employees'
                        ]
                    }
                ],
                availableFunctions: [
                    'search_employees',
                    'create_employee',
                    'manage_contracts'
                ],
                tips: [
                    'Be specific with your requests',
                    'You can use voice input',
                    'Try asking for help with specific tasks'
                ]
            };

            // Act
            service.getHelp().subscribe(help => {
                // Assert
                expect(help).toEqual(expectedHelp);
                expect(help.examples.length).toBe(2);
                expect(help.availableFunctions.length).toBe(3);
                expect(help.tips.length).toBe(3);
            });

            // Assert
            const req = httpMock.expectOne(`${baseUrl}chat/help`);
            expect(req.request.method).toBe('GET');
            req.flush(expectedHelp);
        });
    });
});
