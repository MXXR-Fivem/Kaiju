import { Component, Input, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HudWindowService, WindowState } from '../../services/hud-window.service';

@Component({
  selector: 'app-hud-window',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="windowState?.isOpen"
         (mousedown)="bringToFront()"
         class="fixed bg-black/95 border border-zinc-700 hud-window-shadow flex flex-col select-none font-mono text-xs overflow-hidden"
         [ngClass]="getAccentBorderClass()"
         [style.left.px]="windowState!.x"
         [style.top.px]="windowState!.y"
         [style.width.px]="windowState!.width"
         [style.height.px]="isCollapsed ? 34 : windowState!.height"
         [style.z-index]="windowState!.zIndex">
      
      <div (mousedown)="onDragStart($event)"
           class="h-8 bg-zinc-950 border-b border-zinc-800 px-2.5 flex items-center justify-between cursor-move select-none text-zinc-300">
        <div class="flex items-center gap-2 truncate pointer-events-none">
          <span class="w-1.5 h-1.5" [ngClass]="getAccentDotClass()"></span>
          <span class="font-bold tracking-widest text-[11px] truncate uppercase">
            {{ windowState!.title }}
          </span>
        </div>

        <div class="flex items-center gap-1">
          <button (click)="toggleCollapse($event)"
                  title="Reduire / Agrandir"
                  class="w-5 h-5 flex items-center justify-center border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white bg-black">
            {{ isCollapsed ? '+' : '-' }}
          </button>
          <button (click)="close($event)"
                  title="Fermer la fenetre"
                  class="w-5 h-5 flex items-center justify-center border border-zinc-800 hover:border-red-500 text-zinc-400 hover:text-red-400 bg-black">
            x
          </button>
        </div>
      </div>

      <div *ngIf="!isCollapsed" class="flex-1 overflow-y-auto p-3 bg-black/90 text-zinc-300 relative">
        <ng-content></ng-content>
      </div>

      <div *ngIf="!isCollapsed"
           (mousedown)="onResizeStart($event)"
           class="hud-resize-handle"
           title="Redimensionner la fenetre">
      </div>
    </div>
  `
})
export class HudWindowComponent {
  @Input({ required: true }) windowId!: string;

  private hud = inject(HudWindowService);
  isCollapsed = false;

  get windowState(): WindowState | undefined {
    return this.hud.windows()[this.windowId];
  }

  getAccentBorderClass(): string {
    const color = this.windowState?.accentColor || 'green';
    if (color === 'red') return 'border-t-2 border-t-red-500';
    if (color === 'amber') return 'border-t-2 border-t-amber-500';
    return 'border-t-2 border-t-green-500';
  }

  getAccentDotClass(): string {
    const color = this.windowState?.accentColor || 'green';
    if (color === 'red') return 'bg-red-500';
    if (color === 'amber') return 'bg-amber-500';
    return 'bg-green-500';
  }

  bringToFront(): void {
    this.hud.bringToFront(this.windowId);
  }

  toggleCollapse(e: MouseEvent): void {
    e.stopPropagation();
    this.isCollapsed = !this.isCollapsed;
  }

  close(e: MouseEvent): void {
    e.stopPropagation();
    this.hud.close(this.windowId);
  }

  onDragStart(e: MouseEvent): void {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    this.bringToFront();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = this.windowState?.x ?? 50;
    const initialY = this.windowState?.y ?? 50;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const newX = Math.max(0, Math.min(window.innerWidth - 80, initialX + dx));
      const newY = Math.max(40, Math.min(window.innerHeight - 50, initialY + dy));
      this.hud.updatePosition(this.windowId, newX, newY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onResizeStart(e: MouseEvent): void {
    e.stopPropagation();
    this.bringToFront();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = this.windowState?.width ?? 400;
    const initialH = this.windowState?.height ?? 300;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dw = moveEvent.clientX - startX;
      const dh = moveEvent.clientY - startY;
      const newW = Math.max(300, Math.min(window.innerWidth - 20, initialW + dw));
      const newH = Math.max(180, Math.min(window.innerHeight - 50, initialH + dh));
      this.hud.updateSize(this.windowId, newW, newH);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
}
