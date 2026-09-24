import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bo-capacity-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .bo-consumed {
      background-image: repeating-linear-gradient(135deg, rgba(82, 82, 91, 0.35) 0px, rgba(82, 82, 91, 0.35) 2px, transparent 2px, transparent 5px);
    }
    .bo-segments {
      background-image: repeating-linear-gradient(90deg, transparent 0, transparent calc(5% - 1px), rgba(0, 0, 0, 0.85) calc(5% - 1px), rgba(0, 0, 0, 0.85) 5%);
    }
    .bo-fill {
      transition: width 700ms ease-out, left 700ms ease-out;
    }
    .bo-marker {
      transition: left 700ms ease-out;
    }
  `],
  template: `
    <div class="relative w-full" [style.height.px]="height + 6">
      <div class="absolute left-0 right-0 bg-zinc-950 border border-zinc-800 overflow-hidden"
           [style.top.px]="3"
           [style.height.px]="height">
        <div class="absolute inset-0 bo-consumed"></div>
        <div class="absolute inset-y-0 left-0 bo-fill"
             [ngClass]="availableCls"
             [style.width.%]="availablePct"></div>
        <div class="absolute inset-y-0 bo-fill bg-cyan-400/80"
             [style.left.%]="availablePct"
             [style.width.%]="reservedPct"></div>
        <div *ngIf="segmented" class="absolute inset-0 bo-segments pointer-events-none"></div>
      </div>
      <div *ngIf="thresholdPct > 0"
           class="absolute top-0 bottom-0 w-0.5 -ml-px bg-white bo-marker shadow-[0_0_4px_rgba(255,255,255,0.8)]"
           [style.left.%]="thresholdPct"
           [title]="thresholdLabel"></div>
    </div>
  `
})
export class BoCapacityBarComponent {
  @Input() availablePct = 0;
  @Input() reservedPct = 0;
  @Input() thresholdPct = 0;
  @Input() availableCls = 'bg-green-500';
  @Input() height = 10;
  @Input() segmented = true;
  @Input() thresholdLabel = 'SEUIL DE RETENTION';
}
