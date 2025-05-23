import { Component, ElementRef, inject, LOCALE_ID, OnInit, ViewChild } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarModule, CalendarMonthViewDay, DateAdapter } from 'angular-calendar';
import { SchedulerDateFormatter, SchedulerModule } from 'angular-calendar-scheduler';
import { startOfDay, addHours, addMonths, subMonths, isSameMonth, isSameDay, sub } from 'date-fns';
import { Router } from '@angular/router';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { DOCUMENT } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { dbDAO } from '../dbDAO';

@Component({
  selector: 'app-schedule-calendar',
  imports: [CommonModule ,CalendarModule, SchedulerModule,ReactiveFormsModule],
  template: `
    
    <div (click)="enableView()" class="mainView">
      <div class="menu" (mouseleave)="closeAllSubmenus($event)" #nav>
        <ul class="calendarMenu">
          <li (click)="openMenu($event)" class="item" id="menu-one">Proyectos
            <ul class="closed">
              <li (click)="selectOption('NuevoProyecto')">Nuevo Proyecto</li>
              <li (click)="openView('NuevoProyectoSP')">Nuevo Proyecto sin Plantilla</li>
            </ul>
          </li>
          <li (click)="openMenu($event)" class="item" id="menu-two">Plantillas
            <ul class="closed">
              <li (click)="openView('NuevaPlantilla')">Nueva Plantilla</li>
              <li (click)="selectOption('EditarPlantilla')">Editar Plantilla</li>
            </ul>
          </li>
          <li (click)="openMenu($event)" class="item" id="menu-three">Usuarios
            <ul class="closed" >
              <li (click)="selectOption('CrearUsuario')">Crear Usuario</li>
              <li (click)="selectOption('EditarUsuario')">Editar Usuario</li>
            </ul>
          </li>
          <li (click)="selectOption('CalendarConfig')" class="item" id="menu-four">Calendario
          </li>
        </ul>
      </div>
      <div class="calendar-controls" #buttons>
        <button id="prevMonth" class="calendarButton" (click)="previousMonth()">Mes<br>anterior</button>
        <p style="width: 7rem; text-align: center;">
          {{viewDate.toLocaleDateString('default', {month: 'long'})}}<br>{{viewDate.getFullYear()}}
        </p>
        <button id="nextMonth" class="calendarButton" (click)="nextMonth()">Mes<br>siguiente</button>
      </div>
      <div style="padding: 1rem;" class="calendar" #calendar>
        <mwl-calendar-month-view 
            [viewDate]="viewDate"
            [events]="events"
            (eventClicked)="goToProyectSchedule($event.event)"
            (dayClicked)="ampliarDia($event.day)"
            [activeDayIsOpen]="activeDayIsOpen"
            [eventActionsTemplate]="eventActionsTpl"/>     
      </div>
    </div>
    
    <div class="configDisabled" #config>
      
      <ng-container [ngSwitch]="configOption" >
        <div class="configHeader">
          <h1 class="windowName" #windowName>Sample Text</h1>
          <button class="closeButton" disabled #closeButton (click)="enableView()">Cancelar</button>
        </div>
        <div class="configBody">
          <div *ngSwitchCase="'CalendarConfig'">
            <ng-container *ngTemplateOutlet="calendarConfig"/>
          </div>
          <div *ngSwitchCase="'CrearUsuario'">
            <ng-container *ngTemplateOutlet="createUser"/>
          </div>
          <div *ngSwitchCase="'EditarUsuario'">
            <ng-container *ngTemplateOutlet="editUser"/>
          </div>
          <div *ngSwitchCase="'EditarPlantilla'">
            <ng-container *ngTemplateOutlet="editTemplate"/>
          </div>
          <div *ngSwitchCase="'NuevoProyecto'">
            <ng-container *ngTemplateOutlet="newProyect"/>
          </div>
        </div>
      <ng-template #calendarConfig>
        <h3>Horas de trabajo</h3>
          <div class="workHours">
            <p>Entrada</p>
            <p></p>
            <p>Salida</p>
            <input type="time">
            <p>Hasta</p>
            <input type="time">
          </div>
          <div class="festivos">
            <h3>Dias festivos</h3>
            <div class="dates">
              <input type="date">
              <div id="container">
                <input type="checkbox" name="puente" class="dateEnabler">
                <label for="puente">Hasta</label>
              </div>     
              <input type="date" class="disabled">
              <input type="button" value="agregar" id="addFestivo">
            </div>
            <div class="listVacations">
              <div class="vacations" *ngFor="let fechas of fechasFestivos; index as i">
                  <input type="date">
                  <p>-</p>
                  <input type="date">
                  <input type="button" value="eliminar">
              </div>
            </div>
          </div>
      </ng-template>

      <ng-template #createUser>
        <h3>Datos de Usuario</h3>
        <form [formGroup]="crearUsuario" class="formulario">
          <label for="nombre" class="dataField">Nombre de usuario: </label>
          <input type="text" name="nombre" placeholder="Con numeros y letras minusculas (al menos un caracter)">
          <label class="dataField" for="password">Contraseña: </label>
          <input type="text" name="password" placeholder="Mayusculas, minusculas y letras (al menos 4 caracteres)">
          <div id="contenedorAdmin">
            <input type="checkbox" name="admin">
            <label for="admin">Crear como administrador</label>
          </div>
          <input type="submit" value="Registrar">
        </form>
      </ng-template>

      <ng-template #editUser>
        <h3>Editar Usuario</h3>
        <div class="listUsers">
              <div class="userData" *ngFor="let fechas of fechasFestivos; index as i">
                  <input type="text">
                  <input type="text">
                  <input type="checkbox" name="admin">
                  <label for="admin">Administrador</label>
                  <input type="button" value="eliminar">
              </div>
        </div>
        <input type="button" value="agregar" class="confirmChanges">

      </ng-template>

      <ng-template #editTemplate>
        <h3>Plantillas</h3>
        <div class="listTemplates">
              <div class="templateData" *ngFor="let fechas of fechasFestivos; index as i">
                  <input type="text">
                  <input type="button" value="editar" id="editar">
                  <input type="button" value="eliminar">
              </div>
        </div>
        <input type="button" value="agregar" class="confirmChanges">

      </ng-template>

      <ng-template #newProyect>
      <h3>Plantillas</h3>
        <div class="listSelect">
              <div class="templateSelect" *ngFor="let fechas of fechasFestivos; index as i">
                  <h4>Texto De Ejemplo</h4>
                  <input type="button" value="Usar Plantilla" id="editar">
              </div>
        </div>
      </ng-template>

      <ng-template #eventActionsTpl let-event="event" >
        <button class="removeProyect" mwlCalendarAction="delete">
          X
        </button>
      </ng-template>

    
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
export class ScheduleCalendarComponent{

  public viewDate: Date = new Date();
  public activeDayIsOpen: boolean = false;
  private document: Document = inject(DOCUMENT);
  private router: Router = inject(Router);
  private lock: boolean = false;
  public configOption: string = "";
  private proyects: dbDAO = inject(dbDAO);

  public fechasFestivos: {inicio: Date, fin:Date}[] = [ {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}];
  
  @ViewChild("config") private config!: ElementRef;
  @ViewChild("nav") private nav!: ElementRef;
  @ViewChild("buttons") private buttons!: ElementRef;
  @ViewChild("calendar") private calendar!: ElementRef;
  @ViewChild("closeButton") private closeButton!: ElementRef;

  public crearUsuario: FormGroup =  new FormGroup({
    //nombre: new FormControl(''),
  })

  events: CalendarEvent[] = [];

  constructor(){
    registerLocaleData(localeEs);
    this.downloadEvents();
  }

  async downloadEvents(){
    let dbproyects = await this.proyects.GetProyects();
    this.events = dbproyects ?? [];
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

    this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: event.id}});

  }

  public openMenu(event: Event): void{
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

  public closeMenu(event: Event): void{
    const subMenu = event.target as HTMLUListElement;
    if(subMenu.className !== "closed"){
      subMenu.className = "closed";
    }
  }

  closeAllSubmenus(event: Event){
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
  }

  public selectOption(option: string): void{

    this.configOption = option;

    this.lock = true;
    const nav = this.nav.nativeElement as HTMLElement;
    const calendar = this.calendar.nativeElement as HTMLElement;
    const buttons = this.buttons.nativeElement as HTMLElement;
    const config = this.config.nativeElement as HTMLElement;
    const closeButton = this.closeButton.nativeElement as HTMLElement;

    if(this.configOption !== 'NuevoProyectoSP' && this.configOption !== 'NuevaPlantilla'){
      nav.classList.add('disabled');
      calendar.classList.add('disabled');
      buttons.classList.add('disabled');
      closeButton.removeAttribute("disabled");
    }else{
    }
    
    setTimeout(() => {
      this.lock = false;
        config.className = "configPanel";
    }, 1);

    const windowName = config.querySelector(".windowName");

    let inputs = config.querySelectorAll('input');
    if(inputs){
        inputs.forEach(element => element.removeAttribute('disabled'));
    }
    
    let configBody = config.querySelector(".configBodyDisabled")
    if(configBody){
      configBody.className = "configBody";
    }

    switch (option){
      case "NuevoProyecto":{ 
        windowName!.textContent = "Nuevo Proyecto";
        break;
      }
      case 'NuevoProyectoSP':{
        windowName!.textContent = "Proyecto sin Plantilla";
        break;
      }
      case 'EditarProyecto':{
        windowName!.textContent = "Editar Proyecto";
        break;
      } 
      case 'NuevaPlantilla':{
        windowName!.textContent = "Nueva Plantilla";
        break;
      } 
      case 'EditarPlantilla':{
        windowName!.textContent = "Editar Plantilla";
        break;
      } 
      case 'CrearUsuario':{
        windowName!.textContent = "Nuevo Usuario";
        break;
      }
      case 'EditarUsuario':{
        windowName!.textContent = "Modificar Usuario";
        break;
      } 
      case 'CalendarConfig':{
        windowName!.textContent = "Opciones de Calendario";
        break;
      } 
      default: {
        windowName!.textContent = "NoOPT";
      }
    }

  }

  public enableView(): void{
    const nav = (this.nav.nativeElement as HTMLElement);
    const calendar = this.calendar.nativeElement as HTMLElement;
    const buttons = this.buttons.nativeElement as HTMLElement;
    const config = this.config.nativeElement as HTMLElement;
    const closeButton = this.closeButton.nativeElement as HTMLElement;
    


    if(this.lock === false){
      nav.classList.remove('disabled');
      calendar.classList.remove('disabled');
      buttons.classList.remove('disabled');
      config.querySelectorAll('input').forEach(element => element.setAttribute('disabled', 'disabled'));
      config.className = "configDisabled";
      let configBody = config.querySelector(".configBody");
      if(configBody){
        configBody.className = "configBodyDisabled";
      }
      closeButton.setAttribute("disabled", "");
    }
  }


  openView(view: string): void{
    this.router.navigate(['/proyectSchdedule'], {queryParams:{title: view}});
  }

  getRandomHexColor(): { color: string; dimmed: string } {

  const randomInt = Math.floor(Math.random() * 0x1000000);
  const color = `#${randomInt.toString(16).padStart(6, '0')}`.toUpperCase();

  const dimmed = this.lightenColor(color, 0.5);
  return { color, dimmed };
}


lightenColor(hex: string, percent: number): string {
  
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xFF;
  let g = (num >> 8) & 0xFF;
  let b = num & 0xFF;

 
  r = Math.round(r + (255 - r) * percent);
  g = Math.round(g + (255 - g) * percent);
  b = Math.round(b + (255 - b) * percent);

  
  return `#${((1 << 24) | (r << 16) | (g << 8) | b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}
}
