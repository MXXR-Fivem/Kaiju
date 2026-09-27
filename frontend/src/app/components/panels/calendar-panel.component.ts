import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CrisisContextService } from '../../services/crisis-context.service';

interface CalendarEvent {
  start: Date;
  end: Date;
  kind: 'RESERVATION' | 'CONVOY';
  title: string;
}

const DAY_MS = 24 * 3600000;

@Component({
  selector: 'app-calendar-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="h-full flex flex-col font-mono text-xs space-y-3">
      <div class="flex items-center justify-between">
        <button class="hud-tab" (click)="shift(-7)">◀ Semaine précédente</button>
        <span class="text-zinc-400 uppercase">{{ weekStart() | date: 'dd/MM' }} — {{ weekEnd() | date: 'dd/MM' }}</span>
        <button class="hud-tab" (click)="shift(7)">Semaine suivante ▶</button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        @for (day of days(); track day.date.getTime()) {
          <section>
            <h3 class="hud-title">{{ day.date | date: 'EEEE dd/MM' }}</h3>
            @for (event of day.events; track $index) {
              <div class="flex gap-2 py-0.5" data-testid="calendar-event">
                <span class="w-24 text-zinc-500">{{ event.start | date: 'HH:mm' }} → {{ event.end | date: 'HH:mm' }}</span>
                <span [class.text-sky-400]="event.kind === 'CONVOY'" [class.text-amber-400]="event.kind === 'RESERVATION'">
                  {{ event.kind === 'CONVOY' ? 'Convoi' : 'Réservation' }}
                </span>
                <span class="text-zinc-200">{{ event.title }}</span>
              </div>
            } @empty {
              <p class="text-zinc-600">—</p>
            }
          </section>
        }
      </div>
    </div>
  `
})
export class CalendarPanelComponent {
  private context = inject(CrisisContextService);

  readonly weekStart = signal(this.startOfDay(new Date()));
  readonly weekEnd = computed(() => new Date(this.weekStart().getTime() + 6 * DAY_MS));

  readonly events = computed<CalendarEvent[]>(() => [
    ...this.context
      .reservations()
      .filter((r) => r.status === 'ACTIVE')
      .map((r) => ({
        start: new Date(r.starts_at),
        end: new Date(r.ends_at),
        kind: 'RESERVATION' as const,
        title: `[${r.district_code}] ${r.team_name} · ${r.quantity} × ${r.resource_name}`
      })),
    ...this.context
      .transfers()
      .filter((t) => t.departed_at && t.arrival_at)
      .map((t) => ({
        start: new Date(t.departed_at!),
        end: new Date(t.arrival_at!),
        kind: 'CONVOY' as const,
        title: `${t.source_code} → ${t.target_code} · ${t.quantity} × ${t.resource_name} (${t.status})`
      }))
  ]);

  readonly days = computed(() =>
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date(this.weekStart().getTime() + index * DAY_MS);
      const end = date.getTime() + DAY_MS;
      const events = this.events()
        .filter((event) => event.start.getTime() < end && event.end.getTime() >= date.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      return { date, events };
    })
  );

  shift(days: number): void {
    this.weekStart.update((start) => new Date(start.getTime() + days * DAY_MS));
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
