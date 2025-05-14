import { Component, ElementRef, inject, LOCALE_ID } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarModule, CalendarMonthViewDay, DateAdapter } from 'angular-calendar';
import { SchedulerDateFormatter, SchedulerModule } from 'angular-calendar-scheduler';
import { startOfDay, addHours, addMonths, subMonths, isSameMonth, isSameDay, sub } from 'date-fns';
import { Router } from '@angular/router';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-schedule-calendar',
  imports: [CommonModule ,CalendarModule, SchedulerModule],
  template: `
    
    <div class="menu">
      <ul class="calendarMenu">
        <li (click)="openMenu($event)" class="item" id="menu-one">Proyectos
          <ul class="closed" (mouseleave)="closeMenu($event)">
            <li>Nuevo Proyecto</li>
            <li>Nuevo Proyecto sin Plantilla</li>
            <li>Editar Proyecto</li>
          </ul>
        </li>
        <li (click)="openMenu($event)" class="item" id="menu-four">Plantillas
          <ul class="closed" (mouseleave)="closeMenu($event)">
            <li>Nueva Plantilla</li>
            <li>Editar Plantilla</li>
            <li>Eliminar Plantilla</li>
          </ul>
        </li>
        <li (click)="openMenu($event)" class="item" id="menu-two">Usuarios
          <ul class="closed" (mouseleave)="closeMenu($event)">
            <li>Crear Usuario</li>
            <li>Editar Usuario</li>
            <li>Eliminar Usuario</li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="calendar-controls">
      <button id="prevMonth" class="calendarButton" (click)="previousMonth()">Mes<br>anterior</button>
      <p style="width: 7rem; text-align: center;">
        {{viewDate.toLocaleDateString('default', {month: 'long'})}}<br>{{viewDate.getFullYear()}}
      </p>
      <button id="nextMonth" class="calendarButton" (click)="nextMonth()">Mes<br>siguiente</button>
    </div>
    <div style="padding: 1rem;" class="calendar">
    
      <mwl-calendar-month-view
        [viewDate]="viewDate"
        [events]="events"
        (eventClicked)="goToProyectSchedule($event.event)"
        (dayClicked)="ampliarDia($event.day)"
        [activeDayIsOpen]="activeDayIsOpen"/>
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
  activeDayIsOpen: boolean = false;
  document:Document = inject(DOCUMENT);
  router: Router = inject(Router);
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

  constructor(){
    registerLocaleData(localeEs);
    /*this.document.body.addEventListener("click", (event: Event) =>{
      let menuItems = this.document.querySelectorAll('.item');
      menuItems.forEach(item => {
        let submenu = item.querySelector("ul");
        if(submenu){
          submenu.className = "closed";
        }
      });
    })*/
  }

  previousMonth(): void {
    this.viewDate = subMonths(this.viewDate, 1);
  }

  nextMonth(): void {
    this.viewDate = addMonths(this.viewDate, 1);
  }

  public ampliarDia(dia: CalendarMonthViewDay){
    
    if(isSameMonth(dia.date, this.viewDate)){
      
      if((isSameDay(dia.date, this.viewDate) && this.activeDayIsOpen )|| dia.events.length === 0){
        this.activeDayIsOpen = false;
      }else{
        this.activeDayIsOpen = true;
      }
      this.viewDate = dia.date;
    }
  }

  public goToProyectSchedule(event: CalendarEvent): void {

    this.router.navigate(['/proyectSchdedule'])


  }

  public openMenu(event: Event){
    const element = (event.currentTarget as HTMLLIElement)
    const selectable = element.querySelector('ul');
    let menuItems = this.document.querySelectorAll('.item');
   
    menuItems.forEach(item => {
      if(item.id !== element.id){
        let submenu = item.querySelector("ul");
        if(submenu){
          submenu.className = "closed";
        }
      }
    });
    if(selectable){
      if(selectable.className === "closed"){
        selectable.className = "dropdown";
      }else{
        selectable.className = "closed";
      }
    }
  }

  public closeMenu(event: Event){
    const subMenu = event.target as HTMLUListElement;
    if(subMenu.className !== "closed"){
      subMenu.className = "closed";
    }
  }

  

}
