import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutSegment {
  value: number;
  cls: string;
}

interface DonutArc {
  len: number;
  offset: number;
  cls: string;
}

const RADIUS = 15.91549430918954;

@Component({
  selector: 'app-bo-donut',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .bo-arc {
      transition: stroke-dasharray 600ms ease-out, stroke-dashoffset 600ms ease-out;
    }
  `],
  template: `
    <div class="relative inline-flex items-center justify-center shrink-0"
         [style.width.px]="size"
         [style.height.px]="size">
      <svg viewBox="0 0 36 36" class="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
        <circle *ngIf="ticks"
                cx="18" cy="18" r="17.6"
                fill="none"
                stroke-width="0.5"
                stroke-dasharray="0.45 2.3"
                class="stroke-zinc-700"></circle>
        <circle cx="18" cy="18" [attr.r]="radius"
                fill="none"
                [attr.stroke-width]="thickness"
                [attr.class]="trackCls"></circle>
        <circle *ngFor="let arc of arcs; trackBy: trackByIndex"
                cx="18" cy="18" [attr.r]="radius"
                fill="none"
                stroke-linecap="butt"
                [attr.stroke-width]="thickness"
                [attr.class]="arc.cls + ' bo-arc'"
                [attr.stroke-dasharray]="arc.len + ' ' + (100 - arc.len)"
                [attr.stroke-dashoffset]="-arc.offset"></circle>
      </svg>
      <div class="relative flex flex-col items-center justify-center leading-none text-center">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class BoDonutComponent implements OnChanges {
  @Input() segments: DonutSegment[] = [];
  @Input() size = 64;
  @Input() thickness = 3.2;
  @Input() trackCls = 'stroke-zinc-900';
  @Input() ticks = true;

  readonly radius = RADIUS;
  arcs: DonutArc[] = [];

  trackByIndex(index: number): number {
    return index;
  }

  ngOnChanges(): void {
    let cursor = 0;
    const arcs: DonutArc[] = [];
    for (const seg of this.segments) {
      const raw = Number.isFinite(seg.value) ? seg.value : 0;
      const len = Math.max(0, Math.min(100 - cursor, raw));
      arcs.push({ len, offset: cursor, cls: seg.cls });
      cursor += len;
    }
    this.arcs = arcs;
  }
}
