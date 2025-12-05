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

import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
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
import {
  DataKey,
  DatasourceType,
  Widget,
  widgetType,
  defaultLegendConfig,
  LegendDirection,
  LegendPosition
} from '@shared/models/widget.models';
import { AliasFilterType, EntityAlias, EntityAliases } from '@shared/models/alias.models';
import { singleEntityDataPageLink } from '@shared/models/query/query.models';
import { TimeService } from '@core/services/time.service';
import {
  AggregationType,
  DAY,
  FixedWindow,
  HistoryWindowType,
  Timewindow,
  TimewindowType,
  RealtimeWindowType,
  defaultTimewindow,
  HOUR
} from '@shared/models/time/time.models';
import { FormControl } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';

type TimeRangeValue = '1h' | '3h' | '12h' | '1d' | '7d' | '30d' | 'custom';

interface TimeRangeOption {
  value: TimeRangeValue;
  labelKey: string;
  labelParams?: Record<string, number>;
  durationMs?: number;
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
  selectedTelemetryKeys: string[] = [];
  telemetryKeysControl = new FormControl<string[]>([]);
  loading = true;

  aliasController: IAliasController;
  // @ts-ignore: provide minimal implementation required for AliasController
  stateController: IStateController = {
    getStateParams: (): StateParams => ({})
  } as any;

  widgets: Widget[] = [];
  dashboardTimewindow: Timewindow;

  timeRangeOptions: TimeRangeOption[];
  selectedTimeRange: TimeRangeValue = '1h';
  private lastAppliedPredefinedRange: Exclude<TimeRangeValue, 'custom'> = '1h';
  customRangeDraft: FixedWindow = null;
  customRangeApplied: FixedWindow = null;
  private customRangeDialogRef: MatDialogRef<FixedWindow | undefined>;

  @ViewChild('customTimeRangeDialog')
  customTimeRangeDialog: TemplateRef<any>;

  private destroy$ = new Subject<void>();

  constructor(
    private entityService: EntityService,
    private utils: UtilsService,
    private translate: TranslateService,
    private dashboardUtils: DashboardUtilsService,
    private timeService: TimeService,
    private dialog: MatDialog,
    private datePipe: DatePipe,
    private cd: ChangeDetectorRef
  ) {
    this.timeRangeOptions = [
      { value: '1h', labelKey: 'timewindow.hours', labelParams: { hours: 1 }, durationMs: HOUR },
      { value: '3h', labelKey: 'timewindow.hours', labelParams: { hours: 3 }, durationMs: 3 * HOUR },
      { value: '12h', labelKey: 'timewindow.hours', labelParams: { hours: 12 }, durationMs: 12 * HOUR },
      { value: '1d', labelKey: 'timewindow.days', labelParams: { days: 1 }, durationMs: DAY },
      { value: '7d', labelKey: 'timewindow.days', labelParams: { days: 7 }, durationMs: 7 * DAY },
      { value: '30d', labelKey: 'timewindow.days', labelParams: { days: 30 }, durationMs: 30 * DAY },
      { value: 'custom', labelKey: 'timewindow.date-range' }
    ];
    this.dashboardTimewindow = defaultTimewindow(this.timeService);
    // Switch to realtime: last 1 hour, raw points (no server aggregation)
    this.dashboardTimewindow.selectedTab = TimewindowType.REALTIME;
    this.dashboardTimewindow.realtime.realtimeType = RealtimeWindowType.LAST_INTERVAL;
    this.dashboardTimewindow.realtime.timewindowMs = 60 * 60 * 1000; // 1 hour
    this.dashboardTimewindow.realtime.interval = 1000;
    this.dashboardTimewindow.aggregation.type = AggregationType.NONE;

    this.telemetryKeysControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((selection: string[] | null) => {
        const nextSelection = Array.isArray(selection) ? selection : [];
        this.selectedTelemetryKeys = nextSelection.filter((key) => this.telemetryKeys.includes(key));
        this.createWidgets();
      });
  }

  get timeRangeDisplay(): string {
    if (this.selectedTimeRange === 'custom' && this.customRangeApplied) {
      return this.formatFixedWindow(this.customRangeApplied);
    }
    const option = this.getTimeRangeOption(this.selectedTimeRange);
    if (!option) {
      return '';
    }
    return this.translate.instant(option.labelKey, option.labelParams);
  }

  ngOnInit(): void {
    // Initial loading is handled in ngOnChanges
  }

  ngOnChanges(changes: SimpleChanges): void {
    const entityChanged = !!changes.entity && !changes.entity.firstChange;
    const becameActive = !!changes.active && this.active;
    if ((entityChanged || becameActive) && this.entity && this.active) {
      this.resetChartsState();
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
          this.telemetryKeysControl.setValue([]);
        },
        error: (error) => {
          console.error('Error loading telemetry keys:', error);
          this.telemetryKeysControl.setValue([], {emitEvent: false});
          this.selectedTelemetryKeys = [];
          this.telemetryKeys = [];
          this.widgets = [];
        }
      });
  }

  keepTelemetrySelectOpen(select: MatSelect): void {
    if (select?.multiple && select.panelOpen) {
      setTimeout(() => select.open());
    }
  }

  onTimeRangeChange(value: TimeRangeValue): void {
    if (value === 'custom') {
      this.openCustomRangeDialog(this.lastAppliedPredefinedRange);
      return;
    }
    this.lastAppliedPredefinedRange = value;
    this.customRangeApplied = null;
    this.applyPredefinedRange(value);
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

  private resetChartsState(): void {
    this.telemetryKeysControl.setValue([], {emitEvent: false});
    this.telemetryKeys = [];
    this.selectedTelemetryKeys = [];
    this.widgets = [];
    this.aliasController = null;
  }

  private createWidgets(): void {
    if (!this.selectedTelemetryKeys.length) {
      this.widgets = [];
      return;
    }

    const legendConfig = {
      ...defaultLegendConfig(widgetType.timeseries),
      position: LegendPosition.top,
      direction: LegendDirection.row,
      showLatest: true
    };

    const dataKeys: DataKey[] = this.selectedTelemetryKeys.map((keyName, index) => {
      const globalIndex = this.telemetryKeys.indexOf(keyName);
      return {
        name: keyName,
        label: keyName,
        // @ts-ignore enum/string compatibility
        type: DataKeyType.timeseries as any,
        color: this.utils.getMaterialColor(globalIndex > -1 ? globalIndex : index),
        settings: {},
        _hash: Math.random()
      };
    });

    const widget: Widget = {
      typeFullFqn: 'system.time_series_chart',
      type: widgetType.timeseries,
      sizeX: 24,
      sizeY: 10,
      row: 0,
      col: 0,
      config: {
        title: this.translate.instant('device.telemetry-charts'),
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
          dataKeys
        }],
        useDashboardTimewindow: false,
        displayTimewindow: false,
        timewindow: this.dashboardTimewindow,
        settings: {
          showLegend: true,
          legendConfig,
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

    this.widgets = [widget];
  }

  private applyPredefinedRange(value: TimeRangeValue): void {
    const option = this.getTimeRangeOption(value);
    if (!option?.durationMs) {
      return;
    }
    const nextTimewindow = defaultTimewindow(this.timeService);
    nextTimewindow.selectedTab = TimewindowType.REALTIME;
    nextTimewindow.realtime.realtimeType = RealtimeWindowType.LAST_INTERVAL;
    nextTimewindow.realtime.timewindowMs = option.durationMs;
    nextTimewindow.realtime.interval = 1000;
    nextTimewindow.aggregation.type = AggregationType.NONE;
    this.dashboardTimewindow = nextTimewindow;
    this.createWidgets();
  }

  private applyCustomRange(range: FixedWindow): void {
    const nextTimewindow = defaultTimewindow(this.timeService);
    nextTimewindow.selectedTab = TimewindowType.HISTORY;
    nextTimewindow.history.historyType = HistoryWindowType.FIXED;
    nextTimewindow.history.fixedTimewindow = {
      startTimeMs: range.startTimeMs,
      endTimeMs: range.endTimeMs
    };
    nextTimewindow.history.timewindowMs = range.endTimeMs - range.startTimeMs;
    nextTimewindow.aggregation.type = AggregationType.NONE;
    this.dashboardTimewindow = nextTimewindow;
    this.createWidgets();
  }

  private openCustomRangeDialog(previousValue: TimeRangeValue): void {
    if (!this.customTimeRangeDialog) {
      this.selectedTimeRange = previousValue;
      return;
    }
    this.customRangeDraft = this.customRangeApplied ? { ...this.customRangeApplied } : this.defaultCustomRange();
    this.customRangeDialogRef = this.dialog.open(this.customTimeRangeDialog, {
      width: '480px',
      disableClose: true
    });
    this.customRangeDialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result?: FixedWindow) => {
        if (result && this.isCustomRangeValid(result)) {
          this.customRangeApplied = result;
          this.selectedTimeRange = 'custom';
          this.applyCustomRange(result);
          this.cd.detectChanges();
        } else if (previousValue === 'custom' && this.customRangeApplied) {
          this.selectedTimeRange = 'custom';
        } else {
          this.selectedTimeRange = this.lastAppliedPredefinedRange;
          this.cd.detectChanges();
        }
      });
  }

  confirmCustomRange(): void {
    if (this.customRangeDialogRef && this.isCustomRangeValid(this.customRangeDraft)) {
      this.customRangeDialogRef.close({
        startTimeMs: this.customRangeDraft.startTimeMs,
        endTimeMs: this.customRangeDraft.endTimeMs
      });
    }
  }

  cancelCustomRange(): void {
    if (this.customRangeDialogRef) {
      this.customRangeDialogRef.close();
    }
  }

  private defaultCustomRange(): FixedWindow {
    const now = Date.now();
    return {
      startTimeMs: now - DAY,
      endTimeMs: now
    };
  }

  isCustomRangeValid(range: FixedWindow | null | undefined): range is FixedWindow {
    return !!(range?.startTimeMs && range?.endTimeMs && range.endTimeMs > range.startTimeMs);
  }

  private formatFixedWindow(range: FixedWindow): string {
    const start = this.datePipe.transform(range.startTimeMs, 'yyyy-MM-dd HH:mm');
    const end = this.datePipe.transform(range.endTimeMs, 'yyyy-MM-dd HH:mm');
    if (start && end) {
      return `${start} - ${end}`;
    }
    return this.translate.instant('timewindow.date-range');
  }

  private getTimeRangeOption(value: TimeRangeValue): TimeRangeOption | undefined {
    return this.timeRangeOptions.find((option) => option.value === value);
  }
}
