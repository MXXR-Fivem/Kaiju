import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceIconComponent } from '../icons/resource-icon.component';
import { BoDonutComponent, DonutSegment } from './bo-donut.component';
import { BoCapacityBarComponent } from './bo-capacity-bar.component';
import { DistrictSlice, LEVEL_STYLES, LevelStyle, StockView } from './bo-stock.util';

@Component({
  selector: 'app-bo-resource-card',
  standalone: true,
  imports: [CommonModule, ResourceIconComponent, BoDonutComponent, BoCapacityBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="relative border bg-zinc-950/70 p-2 sm:p-2.5 transition-colors duration-300 hover:bg-zinc-900/60"
             [attr.data-testid]="'stock-' + stock.code"
             [ngClass]="stock.gauge.level === 'CRITICAL' ? 'border-red-900/80 border-l-2 border-l-red-500' : 'border-zinc-800 hover:border-zinc-600'">
      <div class="flex items-start gap-2 sm:gap-3">
        <div class="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
          <div class="flex items-start gap-2">
            <div class="w-10 h-10 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center border bg-black"
                 [ngClass]="[tone.text, tone.border]">
              <app-resource-icon [code]="stock.code" [size]="iconSize"></app-resource-icon>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-[11px] text-zinc-100 uppercase tracking-wider truncate">{{ stock.name }}</span>
                <span class="ml-auto shrink-0 text-[9px] font-bold tracking-widest"
                      [ngClass]="tone.text"
                      [class.animate-pulse]="stock.gauge.level === 'CRITICAL'">
                  {{ tone.tag }}
                </span>
              </div>
              <div class="text-[9px] text-zinc-500 uppercase tracking-widest truncate">
                {{ stock.code }}
                <span *ngIf="stock.gauge.belowRetention" class="text-red-400">· SOUS SEUIL</span>
              </div>
            </div>
          </div>

          <div class="flex items-baseline gap-1.5">
            <span class="text-[9px] text-zinc-500 tracking-widest">DISPO</span>
            <span class="text-base font-bold tabular-nums" [ngClass]="tone.text">{{ stock.figures.available | number:'1.0-0' }}</span>
            <span class="text-[10px] text-zinc-500 tabular-nums">/ {{ stock.figures.initial | number:'1.0-0' }}</span>
          </div>

          <app-bo-capacity-bar
            [availablePct]="stock.gauge.availablePct"
            [reservedPct]="stock.gauge.reservedPct"
            [thresholdPct]="stock.gauge.thresholdPct"
            [availableCls]="tone.bg"
            [thresholdLabel]="'SEUIL DE RETENTION : ' + stock.figures.minRetained">
          </app-bo-capacity-bar>

          <div class="grid grid-cols-4 gap-1 text-[9px] uppercase tracking-wider">
            <div class="border-l border-zinc-800 pl-1.5 min-w-0">
              <div class="text-zinc-500">STOCK</div>
              <div class="text-[11px] text-zinc-200 font-bold tabular-nums truncate" data-testid="current">{{ stock.figures.current | number:'1.0-0' }}</div>
            </div>
            <div class="border-l border-cyan-900 pl-1.5 min-w-0">
              <div class="text-zinc-500">RESERVE</div>
              <div class="text-[11px] text-cyan-300 font-bold tabular-nums truncate" data-testid="reserved">{{ stock.figures.reserved | number:'1.0-0' }}</div>
            </div>
            <div class="border-l border-zinc-800 pl-1.5 min-w-0">
              <div class="text-zinc-500">SEUIL {{ stock.retentionPct | number:'1.0-0' }}%</div>
              <div class="text-[11px] text-zinc-300 font-bold tabular-nums truncate">{{ stock.figures.minRetained | number:'1.0-0' }}</div>
            </div>
            <div class="border-l border-zinc-800 pl-1.5 min-w-0">
              <div class="text-zinc-500">TRANSF.</div>
              <div class="text-[11px] font-bold tabular-nums truncate"
                   [ngClass]="stock.figures.transferable > 0 ? 'text-green-400' : 'text-red-400'">
                {{ stock.figures.transferable | number:'1.0-0' }}
              </div>
            </div>
          </div>

          <div *ngIf="showDistricts && stock.districts.length > 1" class="grid grid-cols-5 gap-1 pt-0.5">
            <button *ngFor="let d of stock.districts; trackBy: trackByCode"
                    type="button"
                    (click)="districtSelect.emit(d.code)"
                    [title]="d.name + ' : ' + d.figures.available + ' / ' + d.figures.initial + ' ' + levelStyle(d).tag"
                    class="group text-left border border-zinc-800 hover:border-zinc-500 bg-black px-1 py-0.5 transition-colors">
              <div class="flex items-center justify-between text-[8px] tracking-widest">
                <span class="text-zinc-400 group-hover:text-white font-bold">[{{ d.code }}]</span>
                <span class="tabular-nums" [ngClass]="levelStyle(d).text">{{ d.gauge.availablePct | number:'1.0-0' }}%</span>
              </div>
              <div class="relative h-1 mt-0.5 bg-zinc-900 overflow-hidden">
                <div class="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                     [ngClass]="levelStyle(d).bg"
                     [style.width.%]="d.gauge.availablePct"></div>
                <div class="absolute inset-y-0 bg-cyan-400/80 transition-all duration-700 ease-out"
                     [style.left.%]="d.gauge.availablePct"
                     [style.width.%]="d.gauge.reservedPct"></div>
              </div>
            </button>
          </div>
        </div>

        <div class="flex flex-col items-center gap-1 pt-0.5">
          <app-bo-donut [segments]="donut" [size]="donutSize" [thickness]="3.6">
            <span class="text-[12px] font-bold tabular-nums" [ngClass]="tone.text">{{ stock.gauge.availablePct | number:'1.0-0' }}%</span>
            <span class="hidden sm:block text-[7px] text-zinc-500 tracking-widest mt-0.5">DISPO</span>
          </app-bo-donut>
          <div class="hidden sm:block text-[8px] text-zinc-600 tracking-widest tabular-nums">
            CONSO {{ stock.gauge.consumedPct | number:'1.0-0' }}%
          </div>
        </div>
      </div>
    </article>
  `
})
export class BoResourceCardComponent implements OnChanges {
  @Input({ required: true }) stock!: StockView;
  @Input() showDistricts = false;
  @Output() districtSelect = new EventEmitter<string>();

  readonly iconSize = window.innerWidth < 640 ? 32 : 40;
  readonly donutSize = window.innerWidth < 640 ? 44 : 58;
  tone: LevelStyle = LEVEL_STYLES.NONE;
  donut: DonutSegment[] = [];

  ngOnChanges(): void {
    this.tone = LEVEL_STYLES[this.stock.gauge.level];
    this.donut = [
      { value: this.stock.gauge.availablePct, cls: this.tone.stroke },
      { value: this.stock.gauge.reservedPct, cls: 'stroke-cyan-400' },
      { value: this.stock.gauge.consumedPct, cls: 'stroke-zinc-700' }
    ];
  }

  levelStyle(slice: DistrictSlice): LevelStyle {
    return LEVEL_STYLES[slice.gauge.level];
  }

  trackByCode(_index: number, slice: DistrictSlice): string {
    return slice.code;
  }
}
