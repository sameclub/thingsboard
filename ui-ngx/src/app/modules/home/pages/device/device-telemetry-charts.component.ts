///
/// Copyright © 2016-2025 The SenSi Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DeviceInfo } from '@shared/models/device.models';
import { EntityService } from '@core/http/entity.service';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AliasController } from '@core/api/alias-controller';
import { IAliasController, IStateController, StateParams } from '@core/api/widget-api.models';
import { DashboardUtilsService } from '@core/services/dashboard-utils.service';
import { TranslateService } from '@ngx-translate/core';
import { UtilsService } from '@core/services/utils.service';
import { DataKey, DatasourceType, Widget, widgetType } from '@shared/models/widget.models';
import { AliasFilterType, EntityAlias, EntityAliases } from '@shared/models/alias.models';
import { singleEntityDataPageLink } from '@shared/models/query/query.models';
import { TimeService } from '@core/services/time.service';
import { Timewindow, TimewindowType, RealtimeWindowType, defaultTimewindow, AggregationType } from '@shared/models/time/time.models';

export interface TelemetryChartData {
  keyName: string;
  values: Array<{timestamp: number, value: any}>;
}

@Component({
  selector: 'tb-device-telemetry-charts',
  templateUrl: './device-telemetry-charts.component.html',
  styleUrls: ['./device-telemetry-charts.component.scss']
})
export class DeviceTelemetryChartsComponent implements OnInit, OnDestroy, OnChanges {

  @Input()
  entity: DeviceInfo;

  @Input()
  active: boolean;

  telemetryKeys: string[] = [];
  loading = true;

  aliasController: IAliasController;
  // @ts-ignore: provide minimal implementation required for AliasController
  stateController: IStateController = {
    getStateParams: (): StateParams => ({})
  } as any;

  widgets: Widget[] = [];
  dashboardTimewindow: Timewindow;

  private destroy$ = new Subject<void>();

  constructor(
    private entityService: EntityService,
    private utils: UtilsService,
    private translate: TranslateService,
    private dashboardUtils: DashboardUtilsService,
    private timeService: TimeService
  ) {
    this.dashboardTimewindow = defaultTimewindow(this.timeService);
    // Switch to realtime: last 1 hour, raw points (no server aggregation)
    this.dashboardTimewindow.selectedTab = TimewindowType.REALTIME;
    this.dashboardTimewindow.realtime.realtimeType = RealtimeWindowType.LAST_INTERVAL;
    this.dashboardTimewindow.realtime.timewindowMs = 60 * 60 * 1000; // 1 hour
    this.dashboardTimewindow.realtime.interval = 1000;
    this.dashboardTimewindow.aggregation.type = AggregationType.NONE;
  }

  ngOnInit(): void {
    if (this.entity && this.active) {
      this.loadTelemetryKeys();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.active && this.active && this.entity) {
      this.loadTelemetryKeys();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByKeyName(index: number, keyName: string): string {
    return keyName;
  }

  private loadTelemetryKeys(): void {
    this.loading = true;
    this.entityService.getEntityKeys(this.entity.id, '', DataKeyType.timeseries)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (keys) => {
          this.telemetryKeys = keys || [];
          this.initAliasController();
          this.createWidgets();
        },
        error: (error) => {
          console.error('Error loading telemetry keys:', error);
          this.telemetryKeys = [];
          this.widgets = [];
        }
      });
  }

  private initAliasController(): void {
    if (this.aliasController) {
      return;
    }
    const entityAlias: EntityAlias = {
      id: this.utils.guid(),
      alias: this.entity.name,
      filter: this.dashboardUtils.createSingleEntityFilter(this.entity.id)
    };
    const entityAliases: EntityAliases = {};
    entityAliases[entityAlias.id] = entityAlias;
    const filters = {} as any;
    this.aliasController = new AliasController(this.utils, this.entityService, this.translate,
      // @ts-ignore – minimal state controller holder
      () => this.stateController, entityAliases, filters);
  }

  private createWidgets(): void {
    const widgets: Widget[] = [];
    const columns = 24;
    const sizeX = 12;
    const sizeY = 8;
    let currentCol = 0;
    let currentRow = 0;

    this.telemetryKeys.forEach((keyName, index) => {
      const dataKey: DataKey = {
        name: keyName,
        label: keyName,
        // @ts-ignore enum/string compatibility
        type: DataKeyType.timeseries as any,
        color: this.utils.getMaterialColor(index),
        settings: {},
        _hash: Math.random()
      };
      const widget: Widget = {
        typeFullFqn: 'system.time_series_chart',
        type: widgetType.timeseries,
        sizeX,
        sizeY,
        row: currentRow,
        col: currentCol,
        config: {
          title: keyName,
          disableAutoReInit: true,
          datasources: [{
            type: DatasourceType.entity,
            name: this.entity.name,
            entityType: this.entity.id.entityType,
            entityId: this.entity.id.id,
            entityName: this.entity.name,
            entityFilter: {
              type: AliasFilterType.singleEntity,
              singleEntity: {
                entityType: this.entity.id.entityType,
                id: this.entity.id.id
              }
            },
            pageLink: singleEntityDataPageLink,
            dataKeys: [dataKey]
          }],
          useDashboardTimewindow: false,
          displayTimewindow: false,
          timewindow: this.dashboardTimewindow,
          settings: {
            showLegend: false,
            dataZoom: true,
            stack: false,
            yAxis: {
              show: true,
              showTickLabels: true,
              showTicks: true,
              showLine: true,
              showSplitLines: true
            },
            xAxis: {
              show: true,
              showTickLabels: true,
              showTicks: true,
              showLine: true,
              showSplitLines: true
            },
            showTooltip: true,
            tooltipTrigger: 'axis',
            tooltipShowDate: true,
            background: {
              type: 'color',
              color: '#fff',
              overlay: {
                enabled: false,
                color: 'rgba(255,255,255,0.72)',
                blur: 3
              }
            }
          },
          dropShadow: true,
          enableFullscreen: false,
          margin: '8px',
          borderRadius: '4px'
        }
      } as any;

      widgets.push(widget);

      // update grid position for next widget
      currentCol += sizeX;
      if (currentCol >= columns) {
        currentCol = 0;
        currentRow += sizeY;
      }
    });

    this.widgets = widgets;
  }
}
