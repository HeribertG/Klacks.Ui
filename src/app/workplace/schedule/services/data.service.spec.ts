import { TestBed } from "@angular/core/testing";
import { DataService } from "./data.service";
import { DataManagementScheduleService } from "src/app/data/management/data-management-schedule.service"; // Pfad anpassen
import { HolidayCollectionService } from "src/app/grid/services/holiday-collection.service";
import { GridSettingsService } from "src/app/grid/services/grid-settings.service";
import { ScrollService } from "./scroll.service";

describe("DataService", () => {
  let service: DataService;
  let mockDataManagementScheduleService: jasmine.SpyObj<DataManagementScheduleService>;
  let mockHolidayCollectionService: jasmine.SpyObj<HolidayCollectionService>;
  let mockGridSettingsService: jasmine.SpyObj<GridSettingsService>;
  let mockScrollService: jasmine.SpyObj<ScrollService>;

  beforeEach(() => {
    mockDataManagementScheduleService = jasmine.createSpyObj(
      "DataManagementScheduleService",
      ["clients"]
    );
    mockHolidayCollectionService = jasmine.createSpyObj(
      "HolidayCollectionService",
      ["holidays"]
    );
    mockGridSettingsService = jasmine.createSpyObj("GridSettingsService", [
      "weekday",
    ]);
    mockScrollService = jasmine.createSpyObj("ScrollService", [
      "maxRows",
      "maxCols",
    ]);

    TestBed.configureTestingModule({
      providers: [
        DataService,
        {
          provide: DataManagementScheduleService,
          useValue: mockDataManagementScheduleService,
        },
        {
          provide: HolidayCollectionService,
          useValue: mockHolidayCollectionService,
        },
        { provide: GridSettingsService, useValue: mockGridSettingsService },
        { provide: ScrollService, useValue: mockScrollService },
      ],
    });
    service = TestBed.inject(DataService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should initialize correctly", () => {
    expect(service).toBeDefined();
  });
});
