import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { DataCountryStateService } from './data-country-state.service';
import { MultiLanguage, ICountry, Country } from '../core/client-class';
import { environment } from 'src/environments/environment';

describe('DataCountryStateService', () => {
  let service: DataCountryStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataCountryStateService],
    });
    service = TestBed.inject(DataCountryStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch country list', () => {
    const country1 = new Country();
    country1.id = '11111111-1111-1111-1111-111111111111';
    country1.name = new MultiLanguage();
    country1.name!.en = 'France';
    const country2 = new Country();
    country2.id = '22222222-2222-2222-2222-222222222222';
    country2.name = new MultiLanguage();
    country2.name!.en = 'England';
    const mockCountries: ICountry[] = [country1, country2];

    service.getCountryList().subscribe((countries) => {
      expect(countries.length).toBe(2);
      expect(countries).toEqual(mockCountries);
    });

    const req = httpMock.expectOne(`${environment.baseUrl}Countries/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCountries);
  });

  it('should add a country', () => {
    const mockCountry = new Country();
    mockCountry.id = '11111111-1111-1111-1111-111111111111';
    mockCountry.name = new MultiLanguage();
    mockCountry.name!.en = 'France';

    service.addCountry(mockCountry).subscribe((country) => {
      expect(country).toEqual(mockCountry);
    });

    const req = httpMock.expectOne(`${environment.baseUrl}Countries/`);
    expect(req.request.method).toBe('POST');
    req.flush(mockCountry);
  });

  it('should update a country', () => {
    const mockCountry = new Country();
    mockCountry.id = '11111111-1111-1111-1111-111111111111';
    mockCountry.name = new MultiLanguage();
    mockCountry.name!.en = 'France';

    service.updateCountry(mockCountry).subscribe((country) => {
      expect(country).toEqual(mockCountry);
    });

    const req = httpMock.expectOne(`${environment.baseUrl}Countries/`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockCountry);
  });

  it('should delete a country', () => {
    const mockCountry = new Country();
    mockCountry.id = '11111111-1111-1111-1111-111111111111';
    mockCountry.name = new MultiLanguage();
    mockCountry.name!.en = 'France';

    service.deleteCountry(mockCountry.id).subscribe((country) => {
      expect(country).toEqual(mockCountry);
    });

    const req = httpMock.expectOne(
      `${environment.baseUrl}Countries/` + mockCountry.id
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(mockCountry);
  });
});
