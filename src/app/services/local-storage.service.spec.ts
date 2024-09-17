import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockLocalStorage: any;

  beforeEach(() => {
    mockLocalStorage = jasmine.createSpyObj('localStorage', [
      'getItem',
      'setItem',
      'removeItem',
      'clear',
    ]);

    // Mock-Methoden an Objekte koppeln, um Funktionalität zu simulieren
    mockLocalStorage.getItem.and.callFake((key: string) => {
      return mockLocalStorage[key];
    });

    mockLocalStorage.setItem.and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    mockLocalStorage.removeItem.and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    mockLocalStorage.clear.and.callFake(() => {
      for (const key in mockLocalStorage) {
        if (Object.prototype.hasOwnProperty.call(mockLocalStorage, key)) {
          delete mockLocalStorage[key];
        }
      }
    });

    // localStorage im globalen Objekt überschreiben
    spyOnProperty(window, 'localStorage', 'get').and.returnValue(
      mockLocalStorage
    );

    // Service-Instanz erstellen
    service = new LocalStorageService();
  });

  it('should get item from localStorage', () => {
    // Einen Wert direkt im mockLocalStorage setzen
    mockLocalStorage.someKey = 'someValue';

    // Testen, ob der Wert korrekt abgerufen wird
    expect(service.get('someKey')).toEqual('someValue');
  });

  it('should set item to localStorage', () => {
    // Wert über den Service setzen
    service.set('someKey', 'someValue');

    // Testen, ob der Wert korrekt im mockLocalStorage gesetzt wurde
    expect(mockLocalStorage.someKey).toEqual('someValue');
  });

  it('should remove item from localStorage', () => {
    // Einen Wert direkt im mockLocalStorage setzen
    mockLocalStorage.someKey = 'someValue';

    // Wert über den Service entfernen
    service.remove('someKey');

    // Testen, ob der Wert korrekt aus dem mockLocalStorage entfernt wurde
    expect(mockLocalStorage.someKey).toBeUndefined();
  });

  it('should get JSON item from localStorage', () => {
    // JSON-String direkt im mockLocalStorage setzen
    mockLocalStorage.someKey = JSON.stringify({ prop: 'value' });

    // JSON über den Service abrufen und Testen
    expect(service.getJson('someKey')).toEqual({ prop: 'value' });
  });

  it('should set JSON item to localStorage', () => {
    // JSON über den Service setzen
    service.setJson('someKey', { prop: 'value' });

    // Testen, ob der JSON-String korrekt im mockLocalStorage gesetzt wurde
    expect(mockLocalStorage.someKey).toEqual(JSON.stringify({ prop: 'value' }));
  });

  it('should clear all items from localStorage', () => {
    // Mehrere Werte direkt im mockLocalStorage setzen
    mockLocalStorage.key1 = 'value1';
    mockLocalStorage.key2 = 'value2';

    // Alle Werte über den Service entfernen
    service.clear();

    // Testen, ob alle Werte korrekt aus dem mockLocalStorage entfernt wurden
    expect(mockLocalStorage.key1).toBeUndefined();
    expect(mockLocalStorage.key2).toBeUndefined();
  });
});
