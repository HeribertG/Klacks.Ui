// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Body of the properties dialog of a selected task in the container template editor: time range start, briefing,
 * debriefing and travel times, the transport mode in mix mode and the time range hint. It is rendered inside the
 * properties ng-template of the container template component, reads the editor services that component provides and
 * marks its OnPush view in ngDoCheck, so it is refreshed whenever the dialog view is checked like the inline template
 * it replaces, because the edited values live in plain service fields.
 * @param modal - The open dialog; dismiss cancels, close saves the edited properties
 * @param propertiesService - Target item of the context menu and the edited property values
 * @param routeService - Whether the container uses the mixed transport mode
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgbActiveModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { formatWorkTime } from 'src/app/domain/helpers/container-template-format.helper';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { IconByCarComponent } from 'src/app/presentation/icons/icon-by-car.component';
import { IconByFootComponent } from 'src/app/presentation/icons/icon-by-foot.component';
import { IconByBicycleComponent } from 'src/app/presentation/icons/icon-by-bicycle.component';
import { ContainerTemplatePropertiesService } from '../services/container-template-properties.service';
import { ContainerTemplateRouteService } from '../services/container-template-route.service';

@Component({
  selector: 'app-container-template-properties-dialog',
  imports: [
    TranslateModule,
    NgbTooltipModule,
    TimeInputComponent,
    IconByCarComponent,
    IconByFootComponent,
    IconByBicycleComponent,
  ],
  templateUrl: './container-template-properties-dialog.component.html',
  styleUrl: './container-template-properties-dialog.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerTemplatePropertiesDialogComponent implements DoCheck {
  readonly modal = input.required<NgbActiveModal>();

  protected readonly TransportModeEnum = TransportModeEnum;
  protected readonly formatTime = formatTime;
  protected readonly formatWorkTime = formatWorkTime;

  protected readonly propertiesService = inject(ContainerTemplatePropertiesService);
  protected readonly routeService = inject(ContainerTemplateRouteService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  ngDoCheck(): void {
    this.changeDetectorRef.markForCheck();
  }
}
