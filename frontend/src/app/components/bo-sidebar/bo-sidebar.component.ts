import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, Subscription, merge, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { DistrictResourceDetail } from '../../models/kaiju.models';
import { BoDonutComponent, DonutSegment } from './bo-donut.component';
import { BoResourceCardComponent } from './bo-resource-card.component';
import {
  DISTRICT_CODES,
  DISTRICT_FALLBACK_NAMES,
  LEVEL_STYLES,
  StockView,
  buildStockViews,
  sortByCriticality,
  summarize
} from './bo-stock.util';

type SortMode = 'CATALOGUE' | 'CRITICITE';

interface LoadResult {
  ok: boolean;
  data: DistrictResourceDetail[];
}

interface SummaryGauge {
  id: string;
  label: string;
  sublabel: string;
  value: string;
  valueCls: string;
  segments: DonutSegment[];
}

@Component({
  selector: 'app-bo-sidebar',
  standalone: true,
  imports: [CommonModule, BoDonutComponent, BoResourceCardComponent],
  template: `
    <section class="h-full w-full min-w-[360px] flex flex-col bg-black text-zinc-300 font-mono text-xs select-none">
      <header class="shrink-0 border-b border-zinc-800 bg-zinc-950/80">
        <div class="h-8 px-3 flex items-center gap-2 border-b border-zinc-900">
          <span class="px-1.5 py-px bg-green-500 text-black text-[10px] font-bold tracking-widest">[BO]</span>
          <span class="text-[10px] text-zinc-400 tracking-widest uppercase truncate">LOGISTIQUE // ETAT DES STOCKS</span>
          <div class="ml-auto flex items-center gap-1.5">
            <span class="text-[9px] tracking-widest tabular-nums"
                  [ngClass]="loadError() ? 'text-red-400' : (loading() ? 'text-amber-400' : 'text-zinc-500')">
              {{ loadError() ? '[SYNC KO]' : (loading() ? '[SYNC...]' : '[SYNC ' + lastSync() + ']') }}
            </span>
            <button type="button"
                    (click)="refresh()"
                    title="Rafraichir les stocks"
                    class="px-1.5 py-0.5 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white text-[9px] tracking-widest uppercase transition-colors">
              RAFRAICHIR
            </button>
            <button type="button"
                    (click)="context.toggleSidebar()"
                    title="Replier le panneau BO"
                    class="w-6 h-5 flex items-center justify-center border border-zinc-800 hover:border-green-500 text-zinc-400 hover:text-green-400 text-[10px] transition-colors">
              &lt;&lt;
            </button>
          </div>
        </div>

        <div class="px-3 pt-2.5 pb-2">
          <div class="text-[9px] text-zinc-500 tracking-widest uppercase">SECTEUR ACTIF</div>
          <div class="flex items-baseline gap-2 mt-0.5 min-w-0">
            <ng-container *ngIf="selectedCode() as code; else globalTitle">
              <span class="text-lg font-bold text-green-400 tracking-widest">[{{ code }}]</span>
              <span class="text-sm font-bold text-white tracking-widest uppercase truncate">{{ districtName(code) }}</span>
            </ng-container>
            <ng-template #globalTitle>
              <span class="text-sm font-bold text-white tracking-widest uppercase truncate">TOKYORK // VUE GLOBALE</span>
              <span class="text-[9px] text-zinc-500 tracking-widest shrink-0">{{ districtCodes.length }} QUARTIERS AGREGES</span>
            </ng-template>
          </div>

          <div class="mt-2 flex items-stretch gap-1" role="tablist">
            <button type="button"
                    role="tab"
                    [attr.aria-selected]="selectedCode() === null"
                    (click)="selectDistrict(null)"
                    class="px-2 py-1 border text-[10px] font-bold tracking-widest uppercase transition-colors"
                    [ngClass]="selectedCode() === null ? 'bg-green-500 text-black border-green-500' : 'bg-black text-zinc-400 border-zinc-800 hover:border-green-500 hover:text-green-400'">
              GLOBAL
            </button>
            <button *ngFor="let code of districtCodes"
                    type="button"
                    role="tab"
                    [attr.aria-selected]="selectedCode() === code"
                    (click)="selectDistrict(code)"
                    [title]="districtName(code)"
                    class="flex-1 px-1 py-1 border text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-1"
                    [ngClass]="selectedCode() === code ? 'bg-green-500 text-black border-green-500' : 'bg-black text-zinc-400 border-zinc-800 hover:border-green-500 hover:text-green-400'">
              <span>{{ code }}</span>
              <span *ngIf="districtCriticalCount()[code] as n"
                    class="px-1 text-[8px]"
                    [ngClass]="selectedCode() === code ? 'bg-black text-red-400' : 'bg-red-500/20 text-red-400'">
                {{ n }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <div class="px-3 pt-3 pb-2 border-b border-zinc-900">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[9px] text-zinc-500 tracking-widest uppercase">SYNTHESE CAPACITAIRE</span>
            <span class="text-[9px] text-zinc-600 tracking-widest uppercase">MOY. {{ summary().measured }} RESSOURCES</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div *ngFor="let g of summaryGauges(); trackBy: trackById"
                 class="flex flex-col items-center gap-1 border border-zinc-900 bg-zinc-950/60 py-2 px-1 min-w-0">
              <app-bo-donut [segments]="g.segments" [size]="62" [thickness]="3.4">
                <span class="text-[12px] font-bold tabular-nums" [ngClass]="g.valueCls">{{ g.value }}</span>
              </app-bo-donut>
              <div class="text-[9px] font-bold text-zinc-300 tracking-widest uppercase text-center truncate w-full">{{ g.label }}</div>
              <div class="text-[8px] text-zinc-600 tracking-wider uppercase text-center truncate w-full">{{ g.sublabel }}</div>
            </div>
          </div>
        </div>

        <div class="sticky top-0 z-10 px-3 py-1.5 bg-black/95 border-b border-zinc-900 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] tracking-widest uppercase">
          <div class="flex items-center gap-1">
            <span class="text-zinc-500">TRI :</span>
            <button type="button"
                    (click)="sortMode.set('CATALOGUE')"
                    class="px-1.5 py-px border transition-colors"
                    [ngClass]="sortMode() === 'CATALOGUE' ? 'border-green-500 text-green-400' : 'border-zinc-800 text-zinc-500 hover:text-white'">
              CATALOGUE
            </button>
            <button type="button"
                    (click)="sortMode.set('CRITICITE')"
                    class="px-1.5 py-px border transition-colors"
                    [ngClass]="sortMode() === 'CRITICITE' ? 'border-green-500 text-green-400' : 'border-zinc-800 text-zinc-500 hover:text-white'">
              CRITICITE
            </button>
          </div>
          <div class="ml-auto flex items-center gap-2 text-zinc-500">
            <span class="flex items-center gap-1"><span class="w-2 h-2 bg-green-500"></span>DISPO</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 bg-cyan-400"></span>RES.</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 border border-zinc-700 bg-zinc-800"></span>CONSO</span>
            <span class="flex items-center gap-1"><span class="w-0.5 h-2.5 bg-white"></span>SEUIL</span>
          </div>
        </div>

        <div class="p-3 space-y-2">
          <div *ngIf="loadError() && inventory().length === 0"
               class="border border-red-900 bg-red-950/30 p-3 text-[10px] text-red-400 tracking-widest uppercase flex items-center justify-between gap-2">
            <span>[LIAISON API ROMPUE] // STOCKS INDISPONIBLES</span>
            <button type="button" (click)="refresh()"
                    class="px-2 py-0.5 border border-red-700 hover:border-red-400 text-red-300 hover:text-white transition-colors">
              RETENTER
            </button>
          </div>

          <div *ngIf="!loadError() && loading() && inventory().length === 0"
               class="border border-zinc-800 p-3 text-[10px] text-amber-400 tracking-widest uppercase animate-pulse">
            [ACQUISITION DES STOCKS EN COURS...]
          </div>

          <div *ngIf="!loading() && inventory().length > 0 && views().length === 0"
               class="border border-zinc-800 p-3 text-[10px] text-zinc-500 tracking-widest uppercase">
            [AUCUNE RESSOURCE REFERENCEE POUR CE SECTEUR]
          </div>

          <app-bo-resource-card *ngFor="let stock of views(); trackBy: trackByCode"
                                [stock]="stock"
                                [showDistricts]="selectedCode() === null"
                                (districtSelect)="selectDistrict($event)">
          </app-bo-resource-card>
        </div>
      </div>

      <footer class="shrink-0 h-7 px-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center gap-3 text-[9px] tracking-widest uppercase">
        <span [ngClass]="summary().criticalCount > 0 ? 'text-red-400' : 'text-zinc-500'">
          [CRITIQUE {{ summary().criticalCount }}]
        </span>
        <span [ngClass]="summary().lowCount > 0 ? 'text-orange-400' : 'text-zinc-500'">
          [TENSION {{ summary().lowCount }}]
        </span>
        <span [ngClass]="summary().watchCount > 0 ? 'text-yellow-300' : 'text-zinc-500'">
          [VIGILANCE {{ summary().watchCount }}]
        </span>
        <span class="ml-auto" [ngClass]="ws.isConnected() ? 'text-green-500' : 'text-red-500'">
          [FLUX TEMPS REEL {{ ws.isConnected() ? 'ACTIF' : 'COUPE' }}]
        </span>
      </footer>
    </section>
  `
})
export class BoSidebarComponent implements OnInit, OnDestroy {
  readonly context = inject(CrisisContextService);
  readonly ws = inject(KaijuWsService);
  private readonly api = inject(KaijuApiService);

  readonly districtCodes = DISTRICT_CODES;
  readonly inventory = signal<DistrictResourceDetail[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<boolean>(false);
  readonly lastSync = signal<string>('--:--:--Z');
  readonly sortMode = signal<SortMode>('CATALOGUE');

  readonly selectedCode = computed(() => this.context.selectedDistrictCode());

  private readonly baseViews = computed<StockView[]>(() =>
    buildStockViews(this.inventory(), this.selectedCode())
  );

  readonly views = computed<StockView[]>(() =>
    this.sortMode() === 'CRITICITE' ? sortByCriticality(this.baseViews()) : this.baseViews()
  );

  readonly summary = computed(() => summarize(this.baseViews()));

  readonly districtCriticalCount = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const code of DISTRICT_CODES) {
      counts[code] = buildStockViews(this.inventory(), code).filter((v) => v.gauge.level === 'CRITICAL').length;
    }
    return counts;
  });

  readonly summaryGauges = computed<SummaryGauge[]>(() => {
    const s = this.summary();
    const availStyle = LEVEL_STYLES[s.availableLevel];
    const criticalShare = s.total > 0 ? (s.criticalCount / s.total) * 100 : 0;
    const lowShare = s.total > 0 ? (s.lowCount / s.total) * 100 : 0;
    const watchShare = s.total > 0 ? (s.watchCount / s.total) * 100 : 0;
    return [
      {
        id: 'available',
        label: 'DISPO',
        sublabel: 'SUR CAPACITE',
        value: this.pct(s.availablePct),
        valueCls: availStyle.text,
        segments: [
          { value: s.availablePct, cls: availStyle.stroke },
          { value: s.reservedPct, cls: 'stroke-cyan-400' }
        ]
      },
      {
        id: 'reserved',
        label: 'RESERVE',
        sublabel: 'BLOQUE LOCAL',
        value: this.pct(s.reservedPct),
        valueCls: 'text-cyan-300',
        segments: [{ value: s.reservedPct, cls: 'stroke-cyan-400' }]
      },
      {
        id: 'transferable',
        label: 'TRANSF.',
        sublabel: 'HORS SEUIL',
        value: this.pct(s.transferablePct),
        valueCls: s.transferablePct > 0 ? 'text-green-400' : 'text-red-400',
        segments: [{ value: s.transferablePct, cls: 'stroke-green-500' }]
      },
      {
        id: 'critical',
        label: 'CRITIQUE',
        sublabel: 'RESSOURCES',
        value: s.criticalCount + '/' + s.total,
        valueCls: s.criticalCount > 0 ? 'text-red-400' : 'text-green-400',
        segments: [
          { value: criticalShare, cls: 'stroke-red-500' },
          { value: lowShare, cls: 'stroke-orange-500' },
          { value: watchShare, cls: 'stroke-yellow-400' }
        ]
      }
    ];
  });

  private readonly refresh$ = new Subject<void>();
  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.refresh$
        .pipe(switchMap(() => this.fetchInventory()))
        .subscribe((result) => {
          this.loading.set(false);
          if (result.ok) {
            this.inventory.set(result.data);
            this.loadError.set(false);
            this.lastSync.set(this.zulu());
          } else {
            this.loadError.set(true);
          }
        })
    );

    this.subs.add(
      merge(this.ws.resourceUpdates$, this.ws.transferUpdates$)
        .pipe(debounceTime(150))
        .subscribe(() => this.refresh())
    );

    this.refresh();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  refresh(): void {
    this.refresh$.next();
  }

  selectDistrict(code: string | null): void {
    this.context.selectDistrict(code);
  }

  districtName(code: string): string {
    const found = this.inventory().find((item) => item.district_code === code);
    return (found?.district_name || DISTRICT_FALLBACK_NAMES[code] || code).toUpperCase();
  }

  trackByCode(_index: number, stock: StockView): string {
    return stock.code;
  }

  trackById(_index: number, gauge: SummaryGauge): string {
    return gauge.id;
  }

  private fetchInventory(): Observable<LoadResult> {
    this.loading.set(true);
    return this.api.getInventory().pipe(
      map((data): LoadResult => ({ ok: true, data: Array.isArray(data) ? data : [] })),
      catchError(() => of<LoadResult>({ ok: false, data: [] }))
    );
  }

  private pct(value: number): string {
    return Math.round(Number.isFinite(value) ? value : 0) + '%';
  }

  private zulu(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
  }
}
