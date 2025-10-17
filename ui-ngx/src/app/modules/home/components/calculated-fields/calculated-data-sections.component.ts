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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, effect, input } from '@angular/core';
import { EntityId } from '@shared/models/id/entity-id';
import {
  AttributeScope,
  TimeseriesData
} from '@shared/models/telemetry/telemetry.models';
import {
  CalculatedField,
  CalculatedFieldType,
  OutputType
} from '@shared/models/calculated-field.models';
import { CalculatedFieldsService } from '@core/http/calculated-fields.service';
import { AttributeService } from '@core/http/attribute.service';
import { PageLink } from '@shared/models/page/page-link';
import { Direction } from '@shared/models/page/sort-order';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

interface OutputItem {
  key: string;
  section: string;
  type: OutputType;
  scope?: AttributeScope;
  ts?: number;
  value?: any;
}

@Component({
  selector: 'tb-calculated-data-sections',
  templateUrl: './calculated-data-sections.component.html',
  styleUrls: ['./calculated-data-sections.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalculatedDataSectionsComponent {
  active = input<boolean>();
  entityId = input<EntityId>();

  loading = false;
  // filter: 'ALL' | 'TS' | 'ATTR'
  filter: 'ALL' | 'TS' | 'ATTR' = 'ALL';

  groups: { key: string, items: OutputItem[] }[] = [];

  // Cache flag to avoid redundant loading
  private hasLoadedData = false;

  readonly OutputType = OutputType;
  readonly CalculatedFieldType = CalculatedFieldType;

  constructor(private calculatedFieldsService: CalculatedFieldsService,
              private attributeService: AttributeService,
              public translate: TranslateService,
              private cd: ChangeDetectorRef,
              private destroyRef: DestroyRef) {
    effect(() => {
      if (this.active() && !this.hasLoadedData) {
        this.loadAll();
      }
    });
  }

  refresh(): void {
    this.hasLoadedData = false;
    this.loadAll();
  }

  setFilter(filter: 'ALL' | 'TS' | 'ATTR') {
    this.filter = filter;
    this.groupAndApply(this._items);
  }

  private _items: OutputItem[] = [];

  loadAll(): void {
    this.loading = true;
    this.groups = [];
    this._items = [];
    this.cd.markForCheck();

    const pageLink = new PageLink(100, 0, null, { property: 'createdTime', direction: Direction.DESC });
    const all: CalculatedField[] = [];
    const fetch = (pl: PageLink): Observable<CalculatedField[]> => this.calculatedFieldsService.getCalculatedFields(this.entityId(), pl).pipe(
      switchMap(page => {
        all.push(...page.data);
        if (page.hasNext) {
          return fetch(pl.nextPageLink());
        } else {
          return of(all);
        }
      })
    );

    fetch(pageLink).pipe(
      take(1),
      switchMap((fields) => {
        // Build outputs map and keys by type
        const uncategorized = this.translate.instant('calculated-data.uncategorized');
        const items: OutputItem[] = [];
        const tsKeys: string[] = [];
        const attrKeysByScope: Record<string, string[]> = {};

        fields.forEach(f => {
          const section = (f.section && f.section.trim()) ? f.section.trim() : uncategorized;
          const out = f.configuration?.output;
          if (!out || !out.name || !out.type) {
            return;
          }
          const item: OutputItem = {
            key: out.name,
            section,
            type: out.type,
            scope: out.scope
          };
          items.push(item);
          if (out.type === OutputType.Timeseries) {
            if (!tsKeys.includes(out.name)) {
              tsKeys.push(out.name);
            }
          } else if (out.type === OutputType.Attribute) {
            const scope = out.scope || AttributeScope.SERVER_SCOPE;
            const arr = attrKeysByScope[scope] || [];
            if (!arr.includes(out.name)) {
              arr.push(out.name);
              attrKeysByScope[scope] = arr;
            }
          }
        });

        this._items = items;

        const ts$ = tsKeys.length ? this.attributeService.getEntityTimeseriesLatest(this.entityId(), tsKeys)
          .pipe(map((tsData: TimeseriesData) => tsData)) : of({} as TimeseriesData);

        const attrsScopes = Object.keys(attrKeysByScope);
        const attrPromises = attrsScopes.map(scope =>
          this.attributeService.getEntityAttributes(this.entityId(), scope as AttributeScope, attrKeysByScope[scope])
        );

        return ts$.pipe(
          switchMap(tsData => {
            if (attrPromises.length) {
              return (attrPromises.length === 1 ? attrPromises[0] : (attrPromises as Observable<any>[]).reduce((acc, o$) => acc.pipe(switchMap(_ => o$)), of([]))).pipe(
                map(() => tsData)
              );
            } else {
              return of(tsData);
            }
          })
        );
      })
    ).subscribe({
      next: () => {
        // Fetch latest again to assign values because we didn't retain attr results above in combined stream;
        // Simpler approach: run separate assigns below.
        this.assignLatestValues().pipe(take(1)).subscribe(() => {
          this.groupAndApply(this._items);
          this.loading = false;
          this.hasLoadedData = true;
          this.cd.markForCheck();
        }, _ => {
          this.loading = false;
          this.cd.markForCheck();
        });
      },
      error: _ => {
        this.loading = false;
        this.cd.markForCheck();
      }
    });
  }

  private assignLatestValues(): Observable<void> {
    const tsKeys = this._items.filter(i => i.type === OutputType.Timeseries).map(i => i.key);
    const attrByScope: Record<string, string[]> = {};
    this._items.filter(i => i.type === OutputType.Attribute).forEach(i => {
      const scope = i.scope || AttributeScope.SERVER_SCOPE;
      if (!attrByScope[scope]) {
        attrByScope[scope] = [];
      }
      if (!attrByScope[scope].includes(i.key)) {
        attrByScope[scope].push(i.key);
      }
    });

    const ts$ = tsKeys.length ? this.attributeService.getEntityTimeseriesLatest(this.entityId(), tsKeys) : of({} as TimeseriesData);
    const attrsScopes = Object.keys(attrByScope);

    return ts$.pipe(
      switchMap(tsData => {
        // assign ts values
        this._items.filter(i => i.type === OutputType.Timeseries).forEach(i => {
          const arr = (tsData as TimeseriesData)[i.key];
          if (arr && arr.length) {
            i.ts = arr[0].ts;
            i.value = arr[0].value;
          }
        });
        if (!attrsScopes.length) {
          return of(void 0);
        }
        // fetch and assign attributes per scope sequentially
        const run = (index: number): Observable<void> => {
          if (index >= attrsScopes.length) {
            return of(void 0);
          }
          const scope = attrsScopes[index] as AttributeScope;
          return this.attributeService.getEntityAttributes(this.entityId(), scope, attrByScope[scope]).pipe(
            switchMap(attrs => {
              attrs.forEach(a => {
                const item = this._items.find(i => i.type === OutputType.Attribute && (i.scope || AttributeScope.SERVER_SCOPE) === scope && i.key === a.key);
                if (item) {
                  item.ts = a.lastUpdateTs;
                  item.value = a.value;
                }
              });
              return run(index + 1);
            })
          );
        };
        return run(0);
      })
    );
  }

  private groupAndApply(items: OutputItem[]) {
    const filtered = this.filter === 'ALL' ? items : items.filter(i => this.filter === 'TS' ? i.type === OutputType.Timeseries : i.type === OutputType.Attribute);
    const mapGroups = new Map<string, OutputItem[]>();
    filtered.forEach(i => {
      const arr = mapGroups.get(i.section) || [];
      arr.push(i);
      mapGroups.set(i.section, arr);
    });
    this.groups = Array.from(mapGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({ key, items }));
  }
}
