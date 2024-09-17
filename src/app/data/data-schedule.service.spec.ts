import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { DataScheduleService } from './data-schedule.service';
import {
  IClientWork,
  IWorkFilter,
  Work,
  WorkFilter,
} from '../core/schedule-class';
import { environment } from 'src/environments/environment';
import {
  Client,
  Address,
  Communication,
  Annotation,
  Membership,
} from '../core/client-class';
import { GenderEnum } from '../helpers/enums/client-enum';

describe('DataScheduleService', () => {
  let service: DataScheduleService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataScheduleService],
    });
    service = TestBed.inject(DataScheduleService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should retrieve a work item by id', () => {
    const mockWorkInstance = mockWork();

    service.getWork('123').subscribe((work) => {
      expect(work).toEqual(mockWorkInstance);
    });

    const req = httpTestingController.expectOne(
      `${environment.baseUrl}Works/123`
    );
    expect(req.request.method).toEqual('GET');
    req.flush(mockWorkInstance);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should add a new work item', () => {
    const newWork = mockWork(); // Verwende Mock-Work-Objekt
    service.addWork(newWork).subscribe((work) => {
      expect(work).toEqual(newWork); // Verifiziere, dass das hinzugefügte Work-Objekt zurückgegeben wird
    });

    const req = httpTestingController.expectOne(`${environment.baseUrl}Works/`);
    expect(req.request.method).toEqual('POST');
    req.flush(newWork); // Simuliere die Antwort
  });

  it('should update an existing work item', () => {
    const updatedWork = mockWork();
    updatedWork.information = 'Updated Information'; // Ändere eine Eigenschaft für den Test

    service.updateWork(updatedWork).subscribe((work) => {
      expect(work).toEqual(updatedWork); // Verifiziere die aktualisierten Daten
    });

    const req = httpTestingController.expectOne(`${environment.baseUrl}Works/`);
    expect(req.request.method).toEqual('PUT');
    req.flush(updatedWork); // Simuliere die Antwort
  });

  it('should retrieve a list of client works based on filter', () => {
    const filter: IWorkFilter = new WorkFilter();

    const mockClientWorks = [mockClientWork(), mockClientWork()]; // Erzeuge eine Liste von Mock-IClientWorks

    service.getClientList(filter).subscribe((clientWorks) => {
      expect(clientWorks.length).toBe(2);
      expect(clientWorks).toEqual(mockClientWorks); // Verifiziere die zurückgegebene Liste
    });

    const req = httpTestingController.expectOne(
      `${environment.baseUrl}Works/GetClientList/`
    );
    expect(req.request.method).toEqual('POST');
    req.flush(mockClientWorks); // Simuliere die Antwort
  });

  const mockClient = (): Client => {
    let client = new Client();
    client.id = 'client-123';
    client.name = 'Test Name';
    client.addresses = [new Address()];
    client.communications = [new Communication()];
    client.annotations = [new Annotation()];
    return client;
  };

  const mockWork = (): Work => {
    let work = new Work();
    work.clientId = 'client-123';
    work.from = new Date(2020, 0, 1);
    work.id = 'work-123';
    work.information = 'Test Information';
    work.isSealed = false;
    work.shiftId = 'shift-123';
    work.until = new Date(2020, 0, 2);
    work.client = mockClient();
    return work;
  };

  const mockClientWork = (): IClientWork => {
    return {
      company: 'Test Company',
      firstName: 'Test',
      gender: GenderEnum.male,
      id: 'cw-123',
      idNumber: 12345,
      legalEntity: true,
      maidenName: 'Maiden',
      membership: new Membership(),
      membershipId: 'membership-123',
      name: 'Test Name',
      secondName: 'Second',
      title: 'Dr.',
      type: 1,
      neededRows: 3,
      works: [mockWork(), mockWork()],
    };
  };
});
