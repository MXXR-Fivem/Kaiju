import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconLayer, RESOURCE_ICONS, RESOURCE_ICON_FRAME, resourceIconKey } from './resource-icons';

@Component({
  selector: 'app-resource-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center justify-center leading-none' },
  template: `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 24 24"
         [attr.width]="size"
         [attr.height]="size"
         fill="none"
         stroke="currentColor"
         stroke-width="1.75"
         stroke-linecap="square"
         stroke-linejoin="miter"
         stroke-miterlimit="4"
         role="img"
         [attr.aria-label]="key"
         class="block">
      <g *ngIf="framed">
        <path *ngFor="let d of frame" [attr.d]="d"></path>
      </g>
      <g [attr.transform]="framed ? 'translate(3.6 3.6) scale(0.7)' : null"
         [attr.stroke-width]="framed ? 2.5 : null">
        <path *ngFor="let layer of layers"
              [attr.d]="layer.d"
              [attr.fill]="layer.fill || 'none'"
              [attr.stroke]="layer.stroke || 'none'"></path>
      </g>
    </svg>
  `,
})
export class ResourceIconComponent {
  @Input() code: string = '';
  @Input() size: number = 20;
  @Input() framed = false;

  readonly frame = RESOURCE_ICON_FRAME;

  get key(): string {
    return resourceIconKey(this.code);
  }

  get layers(): IconLayer[] {
    return RESOURCE_ICONS[this.key];
  }
}
