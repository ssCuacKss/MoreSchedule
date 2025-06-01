import { AfterViewInit, Component, ElementRef, EventEmitter, inject, LOCALE_ID, OnInit, viewChild, ViewChild } from '@angular/core';
import { CalendarA11y, CalendarDateFormatter, CalendarEvent, CalendarModule, CalendarMonthViewDay } from 'angular-calendar';
import { SchedulerDateFormatter, SchedulerModule } from 'angular-calendar-scheduler';
import { startOfDay, addHours, addMonths, subMonths, isSameMonth, isSameDay, format, add, addMinutes} from 'date-fns';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { DOCUMENT } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { dbDAO } from '../dbDAO';
import { CalendarConfig } from '../calendar-config';
import { Proyect } from '../proyect';
import { ColdObservable } from 'rxjs/internal/testing/ColdObservable';
import { Plantilla } from '../plantilla';
import { TareaPlantilla } from '../tarea-plantilla';
import { LinkPlantilla } from '../link-plantilla';
import { parseTemplateTasksToGanttTasks } from '../schedule-chart/schedule-chart.component';
import { Task } from '../task';
import { Link } from '../link';



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
              <li (click)="selectOption('NuevoProyectoSP')">Nuevo Proyecto sin Plantilla</li>
            </ul>
          </li>
          <li (click)="openMenu($event)" class="item" id="menu-two">Plantillas
            <ul class="closed">
              <li (click)="generarNuevaPlantilla()">Nueva Plantilla</li>
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
          <div *ngSwitchCase="'NuevoProyectoSP'">
            <ng-container *ngTemplateOutlet="newProyectNP"/>
          </div>
        </div>
      <ng-template #calendarConfig>
        <h3>Horas de trabajo</h3>
          <div class="workHours">
            <p>Entrada</p>
            <p></p>
            <p>Salida</p>
            <input type="time" [value]="calendarConfigData.entrada" #entrada>
            <p>Hasta</p>
            <input type="time" [value]="calendarConfigData.salida" #salida>
          </div>
          <div class="festivos">
            <h3>Dias festivos</h3>
            <div class="dates">
              <input type="date" #fecha1>
              <div id="container">
                <input type="checkbox" id="puente" class="dateEnabler" (click)="daysSpan($event)">
                <label for="puente">Hasta</label>
              </div>     
              <input type="date" class="disabled" #fecha2 >
              <input type="button" value="agregar" id="addFestivo" #agregarFestivo (click)="agregarFechas()">
            </div>
            <div class="listVacations">
              <div class="vacations" *ngFor="let fechas of calendarConfigData.festivos; index as i">
                  <input type="date" [value]="formatDateToISO(fechas.diaInicio)" class="disabled">
                  <p>-</p>
                  <input type="date" [value]="formatDateToISO(fechas.diaFin)" class="disabled">
                  <input type="button" value="eliminar" [id]="i" (click)="eraseDate($event)">
              </div>
            </div>
            <div id="saveChangesButtonDiv">
            <input type="button" value="Guardar cambios" id="saveCalendarConfig" #saveCalendarConfig (click)="saveConfig()">
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
              <div class="templateData" *ngFor="let plantilla of plantillas; index as i">
                  <h4 class="templateName" [id]="i">{{plantilla.title}}</h4>
                  <input type="button" value="editar" id="editar" (click)="editarPlantilla(plantilla)">
                  <input type="button" value="eliminar" (click)="eliminarPlantilla(plantilla)">
              </div>
        </div>
      </ng-template>

      <ng-template #newProyect>
      <h3>Plantillas</h3>
        <div class="listSelect">
              <div class="templateSelect" *ngFor="let plantilla of plantillas; index as i">
                  <h4>{{plantilla.title}}</h4>
                  <input type="button" value="Usar Plantilla" id="editar" (click)="parsearPlantilla(plantilla)">
              </div>
        </div>
        <div class="dateStartSelector">
          <input type="checkbox" #checkAuto id="autoDate" (click)="autoClicked($event, 'NP_CP')">
          <label for="autoDate">selección de fecha automática</label>
          <input type="datetime-local" #NPDateStart>
        </div>
        
      </ng-template>

      <ng-template #newProyectNP>
      <h3>Plantillas</h3>
        <div id="proyectNameInput">
              <h4>Nombre de Proyecto:</h4>
              <input type="text" #textInputProyectName id="inputName" #NPSPName>
        </div>
        <div class="dateStartSelector">
          <input type="checkbox" id="autoDate" (click)="autoClicked($event, 'NP_SP')">
          <label for="autoDate">selección de fecha automática</label>
          <input type="datetime-local" #NPSPDateStart>
        </div>
        <div id="newProyectSPbutton">
          <input type="button" id="iniciarProyecto" value="Iniciar Proyecto" (click)="iniciarProyecto()">
        </div>
      </ng-template>

      <ng-template #eventActionsTpl let-event="event" >
        <button class="removeProyect" mwlCalendarAction="delete" (click)="eraseProyect(event)">
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
export class ScheduleCalendarComponent implements OnInit{

  public viewDate: Date = new Date();
  public activeDayIsOpen: boolean = false;
  private document: Document = inject(DOCUMENT);
  private router: Router = inject(Router);
  private lock: boolean = false;
  public configOption: string = "";
  private proyects: dbDAO = inject(dbDAO);
  public calendarConfigData!: CalendarConfig;
  public plantillas!: Plantilla[];

  public fechasFestivos: {inicio: Date, fin:Date}[] = [ {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}, {inicio: new Date(), fin: new Date()}];
  
  @ViewChild("config") private config!: ElementRef;
  @ViewChild("nav") private nav!: ElementRef;
  @ViewChild("buttons") private buttons!: ElementRef;
  @ViewChild("calendar") private calendar!: ElementRef;
  @ViewChild("closeButton") private closeButton!: ElementRef;
  @ViewChild('fecha2') private fechaFin!: ElementRef;
  @ViewChild('fecha1') private fechaInicio!: ElementRef;
  @ViewChild('entrada') private entrada!: ElementRef;
  @ViewChild('salida') private salida!: ElementRef;
  @ViewChild('NPSPName') private entradaNPSP!: ElementRef;
  @ViewChild('NPSPDateStart') private dateStartNPSP!: ElementRef;
  @ViewChild('NPDateStart') private dateStartNPCP!: ElementRef



  public crearUsuario: FormGroup =  new FormGroup({
    //nombre: new FormControl(''),
  })

  events: CalendarEvent[] = [];

  constructor(){
    registerLocaleData(localeEs);
    
  }

  async ngOnInit(): Promise<void> {
      this.plantillas = await this.proyects.GetTemplates().then((plantillas: Plantilla[]) =>{
        return plantillas;
      });

      this.downloadEvents();
      this.calendarConfigData = await this.proyects.GetCalendarConfig().then((config: CalendarConfig) => {
        return config;
      });
  }

  async downloadEvents(){
    let dbproyects = await this.proyects.GetProyects();
    this.events = dbproyects ?? [];
    //let cal = this.events[0]
    //let proyect: Proyect = {id: (cal.id as number)+1, start: cal.start, end: getHours(cal.end!.getTime() - cal.start!.getTime())+32 ,title: cal.title, color: {primary: cal.color!.primary as string, secondary: cal.color!.secondary as string} }
    //await this.proyects.createProyect(proyect);
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

    this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: event.id, name: event.title}});

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

    if(this.configOption !== 'NuevaPlantilla'){
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



  getRandomHexColor(): { color: string; dimmed: string } {

  const randomInt = Math.floor(Math.random() * 0x1000000);
  const color = `#${randomInt.toString(16).padStart(6, '0')}`.toUpperCase();

  const dimmed = this.lightenColor(color, 0.6);
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

  public formatDateToISO(usDate: string | undefined): string | undefined {
    if(usDate !== undefined){
      const [month, day, year] = usDate.split('-');
    // Nos aseguramos de tener dos dígitos en mes y día
      if(month.length === 4){
        return usDate
      }else{
        const mm = month.padStart(2, '0');
        const dd = day.padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
      
    }else{
      return undefined;
    }  
  }

  public daysSpan(event: Event){
      const checkbox = event.target as HTMLInputElement;
      const activated = this.fechaFin.nativeElement as HTMLInputElement;
      if(checkbox.checked){
        activated.className = "";
      }else{
        activated.className = "disabled"
        activated.value = "";
      }

  }

  public async saveConfig(){
    const entrada = (this.entrada.nativeElement as HTMLInputElement).value;
    const salida = (this.salida.nativeElement as HTMLInputElement).value;

    if(entrada !== "" && salida !== ""){
      this.calendarConfigData.entrada = entrada;
      this.calendarConfigData.salida = salida;
    }
    

    await this.proyects.updateCalendarConfigPromise(this.calendarConfigData);
  }

  public agregarFechas(){
    const fechaInicio = this.fechaInicio.nativeElement as HTMLInputElement;
    const fechaFin = this.fechaFin.nativeElement as HTMLInputElement;
    
    let insert:{diaInicio: string, diaFin: string | undefined};

    if(fechaInicio.value !== ""){
      let StartDateToInsert = fechaInicio.value;
      if(fechaFin.value === ""){
        insert = {diaInicio: StartDateToInsert, diaFin: undefined};
      }else{
        insert = {diaInicio: StartDateToInsert, diaFin: fechaFin.value};
      }
      
      if(this.calendarConfigData.festivos.indexOf(insert) < 0){
        this.calendarConfigData.festivos.push(insert);
      }
    }
  }

  public eraseDate(event: Event){
    const listIndex = parseInt((event.target as HTMLElement).id);
    this.calendarConfigData.festivos.splice(listIndex, 1);
  }

  public autoClicked(event: Event, mode: string){

    const clicked = (event.target as HTMLInputElement).checked;

    const fecha = mode === 'NP_SP' ? (this.dateStartNPSP.nativeElement as HTMLInputElement) : (this.dateStartNPCP.nativeElement as HTMLInputElement)

    const currentDate = new Date();


    let events = [...this.events];
    if(clicked){
        events.forEach((e: CalendarEvent) => {
        if((e.end ?? "") < currentDate){
          events.splice(events.indexOf(e),1);
        }
      });

      if(events.length === 0){

        let splittedDate = addHours(currentDate,2).toISOString().split(":");
        fecha.value = splittedDate[0]+":"+splittedDate[1];
      }else{
        let currentHighestEndDate = events[0].end;
        events.forEach((e: CalendarEvent) =>{
          if((currentHighestEndDate ?? "") < (e.end ?? "")){
            currentHighestEndDate = e.end;
          }
        });
        let splittedDate = addHours((currentHighestEndDate ?? new Date), 2).toISOString().split(":");
        fecha.value = splittedDate[0]+":"+splittedDate[1];
      }
    }else{
      fecha.value = "";
    }
  }

  public async iniciarProyecto(){
    const fecha = (this.dateStartNPSP.nativeElement as HTMLInputElement);
    const nombre = (this.entradaNPSP.nativeElement as HTMLInputElement);
    

    if(fecha.value !== "" && nombre.value !== ""){
      const newColor = this.getRandomHexColor();
      const calendarEvent: CalendarEvent = {
        id: Math.floor(Math.random() * 100000000),
        start: new Date(fecha.value),
        title: nombre.value,
        end: addHours(new Date(fecha.value),1),
        color: {
          primary: newColor.color,
          secondary: newColor.dimmed
        }
      }
      const ProyectToSave: Proyect = {
        id: calendarEvent.id as number,
        start: format(calendarEvent.start, 'MM-dd-yyyy HH:mm'),
        end: (Math.ceil((calendarEvent.end?.getTime() ?? 0 - calendarEvent.start.getTime())/3600000)),
        title: calendarEvent.title,
        color: {
          primary: calendarEvent.color!.primary,
          secondary: calendarEvent.color!.secondary
        }
      }
      
      await this.proyects.createProyect(ProyectToSave);
      this.events = [...this.events, calendarEvent];
      //console.log(this.events);
      this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: ProyectToSave.id, name: ProyectToSave.title}});
    }

  }

  async eraseProyect(event: CalendarEvent){

    const indexOfEvent = this.events.indexOf(event);
    this.events.splice(indexOfEvent, 1);

    await this.proyects.deleteAllByPidPromise(event.id as number);
    await this.proyects.deleteProyectByPidPromise(event.id as number);

    this.events = [...this.events];
    
    
  }


  public async eliminarPlantilla(element: Plantilla){

    const index = this.plantillas.indexOf(element);
    this.plantillas.splice(index,1);

    this.plantillas = [...this.plantillas];

    await this.proyects.deleteTemplateAllByPidPromise(element.id);
    await this.proyects.deleteTemplateByTidPromise(element.id);

  }

  public async generarNuevaPlantilla(){
    let plantilla: Plantilla;

    const index = Math.ceil(Math.random() * 10000000);

    plantilla = {title: "Nueva Plantilla", end: 0, id: index};

    await this.proyects.createTemplate(plantilla);

    this.router.navigate(['/proyectSchdedule'], {queryParams:{id: plantilla.id ,title: "EditarPlantilla"}});

  }

  public editarPlantilla(plantilla: Plantilla){
    this.router.navigate(['/proyectSchdedule'], {queryParams:{id: plantilla.id ,title: "EditarPlantilla"}});
  }

  public async parsearPlantilla(plantilla: Plantilla){
    const date = (this.dateStartNPCP.nativeElement as HTMLInputElement).value;
    if(date !== ""){
      const tareasPlantilla: TareaPlantilla []= await this.proyects.GetTemplateTasks(plantilla.id).then((tareas: TareaPlantilla[]) => {
        return tareas;
      });

      const parsedTasks: Task[] = parseTemplateTasksToGanttTasks(tareasPlantilla, new Date(date));

      const linksPlantilla: LinkPlantilla[] = await this.proyects.GetTemplateLinks(plantilla.id).then((links: LinkPlantilla[])=>{
        return links;
      });
      
      const parsedLinks = linksPlantilla.map((link: LinkPlantilla)=>{
        return {id: link.id, source: link.source, target: link.target, type: link.type} as Link;
      });

      let span = this.proyectSpan(parsedTasks);

      const newColor = this.getRandomHexColor();
      const calendarEvent: CalendarEvent = {
        id: Math.floor(Math.random() * 100000000),
        start: new Date(date),
        title: "Nuevo Proyecto",
        end: addHours(date,span.hours),
        color: {
          primary: newColor.color,
          secondary: newColor.dimmed
        }
      }
      const ProyectToSave: Proyect = {
        id: calendarEvent.id as number,
        start: format(calendarEvent.start, 'MM-dd-yyyy HH:mm'),
        end: span.hours,
        title: calendarEvent.title,
        color: {
          primary: calendarEvent.color!.primary,
          secondary: calendarEvent.color!.secondary
        }
      }
      
      await this.proyects.createProyect(ProyectToSave);

      await this.proyects.SaveProyectTasksandLinks(ProyectToSave.id,parsedTasks,parsedLinks);

      this.events.push(calendarEvent);

      this.events = [...this.events];

      this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: ProyectToSave.id, name: ProyectToSave.title}});

    }
  
  }

  proyectSpan(tareas: Task[]):{startDate: Date, hours: number}{
    
    let earliestStart: Date = new Date(0); 
    let latestEnd: Date = new Date(0);
    let started: boolean = false;
   
    tareas.forEach((t)=>{
      if(!started){
        earliestStart = new Date(t.start_date);
        latestEnd = addMinutes(new Date(t.start_date), t.duration);
        started = true;
      }else{
        if(earliestStart > new Date(t.start_date)){
          earliestStart = new Date(t.start_date)
        }
        if(latestEnd < addMinutes(new Date(t.start_date), t.duration)){
          latestEnd = addMinutes(new Date(t.start_date), t.duration);
        }
      }
    });

    //console.log(Math.ceil((latestEnd.getTime() - earliestStart.getTime())/3600000));

    return { startDate: earliestStart, hours: Math.ceil((latestEnd.getTime() - earliestStart.getTime())/3600000) };
  }

}
