import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EventBus } from './event-bus.service';
import { DomainEventHandler } from 'src/app/presentation/handlers/domain-event.handler';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  DomainEventType,
  ErrorEvent,
  SuccessEvent,
  WarningEvent,
  InfoEvent,
  NavigationEvent,
} from 'src/app/domain/events/domain-events';

describe('EventBus Integration Tests', () => {
  let eventBus: EventBus;
  let domainEventHandler: DomainEventHandler;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const toastServiceSpy = jasmine.createSpyObj('ToastShowService', [
      'showError',
      'showSuccess',
      'showInfo',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        EventBus,
        DomainEventHandler,
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    eventBus = TestBed.inject(EventBus);
    domainEventHandler = TestBed.inject(DomainEventHandler);
    mockToastService = TestBed.inject(ToastShowService) as jasmine.SpyObj<ToastShowService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('ERROR Event Flow', () => {
    it('should propagate ERROR event from Domain to Toast', (done) => {
      const errorEvent: ErrorEvent = {
        message: 'Test error message',
        code: 'TEST_ERROR',
        context: 'TestService.testMethod',
      };

      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalledWith(
          errorEvent.message,
          errorEvent.code
        );
        done();
      }, 100);

      eventBus.emit(DomainEventType.ERROR, errorEvent);
    });

    it('should handle ERROR event without code', (done) => {
      const errorEvent: ErrorEvent = {
        message: 'Error without code',
      };

      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalledWith(
          errorEvent.message,
          'Error'
        );
        done();
      }, 100);

      eventBus.emit(DomainEventType.ERROR, errorEvent);
    });

    it('should handle multiple ERROR events', (done) => {
      eventBus.emit(DomainEventType.ERROR, { message: 'Error 1', code: 'ERR1' });
      eventBus.emit(DomainEventType.ERROR, { message: 'Error 2', code: 'ERR2' });
      eventBus.emit(DomainEventType.ERROR, { message: 'Error 3', code: 'ERR3' });

      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalledTimes(3);
        expect(mockToastService.showError).toHaveBeenCalledWith('Error 1', 'ERR1');
        expect(mockToastService.showError).toHaveBeenCalledWith('Error 2', 'ERR2');
        expect(mockToastService.showError).toHaveBeenCalledWith('Error 3', 'ERR3');
        done();
      }, 100);
    });
  });

  describe('SUCCESS Event Flow', () => {
    it('should propagate SUCCESS event from Domain to Toast', (done) => {
      const successEvent: SuccessEvent = {
        message: 'Operation successful',
        context: 'ShiftService.saveShift',
      };

      setTimeout(() => {
        expect(mockToastService.showSuccess).toHaveBeenCalledWith(
          successEvent.message,
          successEvent.context || '',
          ''
        );
        done();
      }, 100);

      eventBus.emit(DomainEventType.SUCCESS, successEvent);
    });

    it('should handle SUCCESS event without context', (done) => {
      const successEvent: SuccessEvent = {
        message: 'Success!',
      };

      setTimeout(() => {
        expect(mockToastService.showSuccess).toHaveBeenCalledWith(
          successEvent.message,
          '',
          ''
        );
        done();
      }, 100);

      eventBus.emit(DomainEventType.SUCCESS, successEvent);
    });
  });

  describe('WARNING Event Flow', () => {
    it('should propagate WARNING event from Domain to Toast (as Info)', (done) => {
      const warningEvent: WarningEvent = {
        message: 'Warning message',
        context: 'TestService',
      };

      setTimeout(() => {
        expect(mockToastService.showInfo).toHaveBeenCalledWith(
          warningEvent.message,
          warningEvent.context || '',
          ''
        );
        done();
      }, 100);

      eventBus.emit(DomainEventType.WARNING, warningEvent);
    });
  });

  describe('INFO Event Flow', () => {
    it('should propagate INFO event from Domain to Toast', (done) => {
      const infoEvent: InfoEvent = {
        message: 'Information message',
        context: 'TestService',
      };

      setTimeout(() => {
        expect(mockToastService.showInfo).toHaveBeenCalledWith(
          infoEvent.message,
          infoEvent.context || '',
          ''
        );
        done();
      }, 100);

      eventBus.emit(DomainEventType.INFO, infoEvent);
    });
  });

  describe('NAVIGATE Event Flow', () => {
    it('should propagate NAVIGATE event from Domain to Router', (done) => {
      const navigationEvent: NavigationEvent = {
        route: '/workplace/shift',
      };

      setTimeout(() => {
        expect(mockRouter.navigate).toHaveBeenCalledWith([navigationEvent.route]);
        done();
      }, 100);

      eventBus.emit(DomainEventType.NAVIGATE, navigationEvent);
    });

    it('should handle multiple navigation events', (done) => {
      eventBus.emit(DomainEventType.NAVIGATE, { route: '/route1' });
      eventBus.emit(DomainEventType.NAVIGATE, { route: '/route2' });

      setTimeout(() => {
        expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/route1']);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/route2']);
        done();
      }, 100);
    });
  });

  describe('Mixed Event Flow', () => {
    it('should handle multiple different event types', (done) => {
      eventBus.emit(DomainEventType.ERROR, { message: 'Error' });
      eventBus.emit(DomainEventType.SUCCESS, { message: 'Success' });
      eventBus.emit(DomainEventType.INFO, { message: 'Info' });
      eventBus.emit(DomainEventType.NAVIGATE, { route: '/test' });

      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalledTimes(1);
        expect(mockToastService.showSuccess).toHaveBeenCalledTimes(1);
        expect(mockToastService.showInfo).toHaveBeenCalledTimes(1);
        expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
        done();
      }, 100);
    });

    it('should process events in order', (done) => {
      const calls: string[] = [];

      mockToastService.showError.and.callFake(() => calls.push('error'));
      mockToastService.showSuccess.and.callFake(() => calls.push('success'));
      mockToastService.showInfo.and.callFake(() => calls.push('info'));

      eventBus.emit(DomainEventType.ERROR, { message: '1' });
      eventBus.emit(DomainEventType.SUCCESS, { message: '2' });
      eventBus.emit(DomainEventType.INFO, { message: '3' });

      setTimeout(() => {
        expect(calls).toEqual(['error', 'success', 'info']);
        done();
      }, 100);
    });
  });

  describe('Domain Service Simulation', () => {
    it('should simulate a Domain Service emitting events', (done) => {
      class MockDomainService {
        constructor(private eventBus: EventBus) {}

        async saveData(data: unknown): Promise<void> {
          try {
            if (!data) {
              this.eventBus.emit(DomainEventType.ERROR, {
                message: 'Data is required',
                code: 'VALIDATION_ERROR',
                context: 'MockDomainService.saveData',
              });
              return;
            }

            this.eventBus.emit(DomainEventType.SUCCESS, {
              message: 'Data saved successfully',
              context: 'MockDomainService.saveData',
            });

            this.eventBus.emit(DomainEventType.NAVIGATE, {
              route: '/success-page',
            });
          } catch (error) {
            this.eventBus.emit(DomainEventType.ERROR, {
              message: 'Failed to save data',
              code: 'SAVE_ERROR',
              context: 'MockDomainService.saveData',
            });
          }
        }
      }

      const service = new MockDomainService(eventBus);
      service.saveData({ id: 1 });

      setTimeout(() => {
        expect(mockToastService.showSuccess).toHaveBeenCalledWith(
          'Data saved successfully',
          'MockDomainService.saveData',
          ''
        );
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/success-page']);
        done();
      }, 100);
    });

    it('should simulate validation error flow', (done) => {
      class MockDomainService {
        constructor(private eventBus: EventBus) {}

        validateAndSave(data: unknown): void {
          if (!data) {
            this.eventBus.emit(DomainEventType.ERROR, {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
            });
            return;
          }
        }
      }

      const service = new MockDomainService(eventBus);
      service.validateAndSave(null);

      setTimeout(() => {
        expect(mockToastService.showError).toHaveBeenCalledWith(
          'Validation failed',
          'VALIDATION_ERROR'
        );
        done();
      }, 100);
    });
  });

  describe('Event Isolation', () => {
    it('should not interfere with other observers', (done) => {
      let customObserverCalled = false;

      eventBus.on<ErrorEvent>(DomainEventType.ERROR).subscribe((event) => {
        customObserverCalled = true;
        expect(event.message).toBe('Test error');
      });

      eventBus.emit(DomainEventType.ERROR, {
        message: 'Test error',
        code: 'TEST',
      });

      setTimeout(() => {
        expect(customObserverCalled).toBe(true);
        expect(mockToastService.showError).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Performance', () => {
    it('should handle rapid event emission', (done) => {
      const eventCount = 100;

      for (let i = 0; i < eventCount; i++) {
        eventBus.emit(DomainEventType.INFO, {
          message: `Event ${i}`,
        });
      }

      setTimeout(() => {
        expect(mockToastService.showInfo).toHaveBeenCalledTimes(eventCount);
        done();
      }, 200);
    });
  });
});
