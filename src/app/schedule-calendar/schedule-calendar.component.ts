import { Component, LOCALE_ID } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarModule, DateAdapter } from 'angular-calendar';
import { SchedulerDateFormatter, SchedulerModule } from 'angular-calendar-scheduler';
import { startOfDay, addHours, addMonths, subMonths } from 'date-fns';
import { Router } from '@angular/router';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

@Component({
  selector: 'app-schedule-calendar',
  imports: [CommonModule ,CalendarModule, SchedulerModule],
  template: `
    
    <div style="padding: 1rem;" class="calendar">
      <mwl-calendar-month-view
        [viewDate]="viewDate"
        [events]="events"
        (eventClicked)="goToProyectSchedule($event.event)"/>
    </div>
    <div class="calendar-controls">
      <button (click)="previousMonth()">&lt; Mes Anterior</button>
      <p style="width: 7rem; text-align: center;">
        {{viewDate.toLocaleDateString('default', {month: 'long'})}} {{viewDate.getFullYear()}}
      </p>
      <button (click)="nextMonth()">Mes Siguiente &gt;</button>
    </div>
    
  `,
  styleUrl: './schedule-calendar.component.css',
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: SchedulerDateFormatter
    },
    {
      provide: LOCALE_ID,
      useValue: 'es'
    }
  ]
})
export class ScheduleCalendarComponent  {

  viewDate: Date = new Date();
  events: CalendarEvent[] = [
    {
      start: startOfDay(new Date("05-06-2025")),
      end: addHours(startOfDay(new Date("05-06-2025")), 72),
      title: 'Reunión de equipo',
      color: {
        primary: '#1e90ff',
        secondary: '#D1E8FF'
      },
    },
    {
      start: startOfDay(new Date("05-04-2025")),
      end: addHours(new Date("05-04-2025"), 5),
      title: 'Desarrollo de tarea',
      color: {
        primary: '#e3bc08',
        secondary: '#FDF1BA'
      },
    }
  ];

  constructor(private router: Router){
    registerLocaleData(localeEs);
  }

  previousMonth(): void {
    this.viewDate = subMonths(this.viewDate, 1);
  }

  nextMonth(): void {
    this.viewDate = addMonths(this.viewDate, 1);
  }


  public goToProyectSchedule(event: CalendarEvent): void {

    this.router.navigate(['/proyectSchdedule'])


  }


}
