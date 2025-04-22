import { Component } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarModule, CalendarView } from 'angular-calendar';
import { SchedulerDateFormatter } from 'angular-calendar-scheduler';
import { startOfDay, addHours } from 'date-fns';
import { Router } from '@angular/router';

@Component({
  selector: 'app-schedule-calendar',
  imports: [CalendarModule],
  template: `
    <p>
      schedule-calendar works!
    </p>

    <div style="padding: 1rem;">
      <mwl-calendar-month-view
        [viewDate]="viewDate"
        [events]="events"
        (eventClicked)="goToProyectSchedule($event.event)"/>
    </div>
  `,
  styleUrl: './schedule-calendar.component.css',
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: SchedulerDateFormatter
    }
  ]
})
export class ScheduleCalendarComponent  {

  viewDate: Date = new Date();
  events: CalendarEvent[] = [
    {
      start: startOfDay(new Date()),
      end: addHours(startOfDay(new Date()), 9),
      title: 'Reunión de equipo',
      color: {
        primary: '#1e90ff',
        secondary: '#D1E8FF'
      },
    },
    {
      start: addHours(new Date(), 3),
      end: addHours(new Date(), 5),
      title: 'Desarrollo de tarea',
      color: {
        primary: '#e3bc08',
        secondary: '#FDF1BA'
      },
    }
  ];

  constructor(private router: Router){

  }

  public goToProyectSchedule(event: CalendarEvent): void {

    this.router.navigate(['/proyectSchdedule'])


  }
}
