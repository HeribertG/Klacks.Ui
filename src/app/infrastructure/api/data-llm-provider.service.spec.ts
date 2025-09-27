import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataLLMProviderService, ILLMProvider, ICreateProviderRequest, IUpdateProviderRequest } from './data-llm-provider.service';
import { environment } from 'src/environments/environment';

describe('DataLLMProviderService', () => {
  let service: DataLLMProviderService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  const mockProvider: ILLMProvider = {
    id: '1',
    providerId: 'test',
    providerName: 'Test Provider',
    isEnabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://test.com',
    apiVersion: '1.0',
    priority: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataLLMProviderService]
    });
    service = TestBed.inject(DataLLMProviderService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}providers`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProviders', () => {
    it('should fetch all providers', () => {
      // Arrange
      const expectedProviders: ILLMProvider[] = [
        {
          id: '1',
          providerId: 'openai',
          providerName: 'OpenAI',
          isEnabled: true,
          apiKey: 'sk-***',
          baseUrl: 'https://api.openai.com/v1',
          apiVersion: '2023-07-01',
          priority: 1
        },
        {
          id: '2',
          providerId: 'anthropic',
          providerName: 'Anthropic',
          isEnabled: false,
          priority: 2
        }
      ];

      // Act
      service.getProviders().subscribe(providers => {
        // Assert
        expect(providers).toEqual(expectedProviders);
        expect(providers.length).toBe(2);
        expect(providers[0].providerId).toBe('openai');
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(expectedProviders);
    });

    it('should retry on failure', (done) => {
      // Act
      service.getProviders().subscribe({
        error: (error) => {
          // Assert
          expect(error).toBeDefined();
          done();
        }
      });

      // Assert
      for (let i = 0; i < 4; i++) { // Initial request + 3 retries
        const req = httpMock.expectOne(apiUrl);
        req.error(new ProgressEvent('error'));
      }
    });
  });

  describe('getProvider', () => {
    it('should fetch specific provider', () => {
      // Arrange
      const providerId = '1';
      const expectedProvider: ILLMProvider = {
        id: '1',
        providerId: 'openai',
        providerName: 'OpenAI',
        isEnabled: true,
        apiKey: 'sk-***',
        baseUrl: 'https://api.openai.com/v1',
        priority: 1
      };

      // Act
      service.getProvider(providerId).subscribe(provider => {
        // Assert
        expect(provider).toEqual(expectedProvider);
        expect(provider.providerId).toBe('openai');
      });

      // Assert
      const req = httpMock.expectOne(`${apiUrl}/${providerId}`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedProvider);
    });
  });

  describe('createProvider', () => {
    it('should create new provider', () => {
      // Arrange
      const createRequest: ICreateProviderRequest = {
        providerId: 'gemini',
        providerName: 'Google Gemini',
        apiKey: 'test-api-key',
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        apiVersion: 'v1',
        isEnabled: true,
        priority: 3
      };
      const expectedResponse: ILLMProvider = {
        id: '3',
        ...createRequest
      };

      // Act
      service.createProvider(createRequest).subscribe(provider => {
        // Assert
        expect(provider).toEqual(expectedResponse);
        expect(provider.id).toBe('3');
        expect(provider.providerId).toBe('gemini');
      });

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(expectedResponse);
    });
  });

  describe('updateProvider', () => {
    it('should update existing provider', () => {
      // Arrange
      const providerId = '1';
      const updateRequest: IUpdateProviderRequest = {
        apiKey: 'new-api-key',
        baseUrl: 'https://new-api.openai.com/v1',
        isEnabled: false,
        priority: 5
      };
      const expectedResponse: ILLMProvider = {
        id: '1',
        providerId: 'openai',
        providerName: 'OpenAI',
        apiKey: 'new-api-key',
        baseUrl: 'https://new-api.openai.com/v1',
        isEnabled: false,
        priority: 5
      };

      // Act
      service.updateProvider(providerId, updateRequest).subscribe(provider => {
        // Assert
        expect(provider).toEqual(expectedResponse);
        expect(provider.apiKey).toBe('new-api-key');
        expect(provider.isEnabled).toBe(false);
      });

      // Assert
      const req = httpMock.expectOne(`${apiUrl}/${providerId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(expectedResponse);
    });
  });

  describe('deleteProvider', () => {
    it('should delete provider', () => {
      // Arrange
      const providerId = '1';

      // Act
      service.deleteProvider(providerId).subscribe(response => {
        // Assert
        expect(response).toBeNull(); // Void response returns null
      });

      // Assert
      const req = httpMock.expectOne(`${apiUrl}/${providerId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('error handling', () => {
    it('should make HTTP request for getProvider', () => {
      // Act
      service.getProvider('test-id').subscribe();

      // Assert
      const req = httpMock.expectOne(`${apiUrl}/test-id`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProvider);
    });

    it('should make HTTP request for createProvider', () => {
      // Arrange
      const createRequest: ICreateProviderRequest = {
        providerId: 'test',
        providerName: 'Test',
        isEnabled: true,
        priority: 1
      };

      // Act
      service.createProvider(createRequest).subscribe();

      // Assert
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockProvider);
    });
  });
});