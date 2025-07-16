import { Component, ElementRef, inject, LOCALE_ID, OnInit, ViewChild } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarModule, CalendarMonthViewDay } from 'angular-calendar';
import { SchedulerDateFormatter, SchedulerModule } from 'angular-calendar-scheduler';
import { startOfDay, addHours, addMonths, subMonths, isSameMonth, isSameDay, format, add, addMinutes} from 'date-fns';
import { Router } from '@angular/router';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { DOCUMENT } from '@angular/common';
import { ReactiveFormsModule} from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { dbDAO } from '../dbDAO';
import { CalendarConfig } from '../DTO/calendar-config';
import { Proyect } from '../DTO/proyect';
import { Plantilla } from '../DTO/plantilla';
import { TareaPlantilla } from '../DTO/tarea-plantilla';
import { LinkPlantilla } from '../DTO/link-plantilla';
import { parseTemplateTasksToGanttTasks } from '../schedule-chart/schedule-chart.component';
import { Task } from '../DTO/task';
import { Link } from '../DTO/link';
import { User } from '../DTO/user';





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
              <!--<li (click)="selectOption('NuevoProyectoSP')">Nuevo Proyecto sin Plantilla</li>-->
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
          <div class="workHours">ElegirPlantilla(plantilla)
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
        <form [formGroup]="crearUsuario" class="formulario" >
          <label for="nombre" class="dataField">Nombre de usuario: </label>
          <input type="text" id="nombre" placeholder="Con letras minusculas (al menos un caracter)" formControlName="nombre">
          <label class="dataField" for="password">Contraseña: </label>
          <input type="text" name="password" placeholder="Mayusculas, minusculas y números (al menos 4 caracteres)" formControlName="password">
          <div id="contenedorAdmin">
            <input type="checkbox" id="admin" formControlName="admin">
            <label for="admin">Crear como administrador</label>
          </div>
          <div class="hidden" #errorMessage></div>
          <input type="submit" value="Registrar" (click)="uploadNewUser()">
        </form>
      </ng-template>

      <ng-template #editUser>
        <h3>Editar Usuario</h3>
        <div class="listUsers">
          <div class="userData" *ngFor="let user of usuariosFront; index as i">
            <h4>{{user.uname}}</h4>
            <h4>{{user.pass}}</h4>
            <div id="editAlternatives">
            <div>
              <input type="checkbox" id="admin" [checked]="user.admin" (click)="actualizarAdmin($event, i)">
              <label for="admin">Administrador</label>
            </div>
            <div>
              <input type="checkbox" id="disponible" [checked]="user.disponible" (click)="actualizarDisponible($event, i)">
              <label for="disponible">Disponible</label>
            </div>
            </div>   
            <input type="button" value="eliminar" (click)="eliminarUsuario(user, i)" >
            <div id="operatorTasks" *ngIf="(user.disponible && user.tareas !== undefined && user.tareas !== null && user.tareas.length !== 0)">
            <div class="tareasEnLinea">
              <div *ngFor="let tarea of user.tareas; index as j">
                [Tarea: {{tarea.tarea}} - termina: {{tarea.acaba}}]
              </div>
            </div>
            </div>
          </div>
        </div>
        <input type="button" value="agregar" class="confirmChanges" (click)="actualizarUsuarios()">

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
                  <input type="button" value="Usar Plantilla" id="editar" (click)="elegirPlantilla(plantilla)">
              </div>
        </div>
        <div class="dateStartSelector">
          <input type="checkbox" #checkAuto id="autoDate" (click)="autoClicked($event)">
          <label for="autoDate">selección de fecha automática</label>
          <input type="datetime-local" #NPDateStart>
        </div>
        <div id="quantity">
          <input type="button" id="quantitySelector" #proyectAddFromTemplate value="Crear Proyecto" (click)="parsearPlantilla()">
        </div>
        
      </ng-template>

      <ng-template #newProyectNP>
      <h3>Plantillas</h3>
        <div id="proyectNameInput">
              <h4>Nombre de Proyecto:</h4>
              <input type="text" #textInputProyectName id="inputName" #NPSPName>
        </div>
        <div class="dateStartSelector">
          <input type="checkbox" id="autoDate" (click)="autoClicked($event)">
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
  private users!: User[];
  public usuariosFront!: User[];
  private plantillaElegida?: Plantilla = undefined;
  
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
  @ViewChild('NPDateStart') private dateStartNPCP!: ElementRef;
  @ViewChild('proyectAddFromTemplate') private proyectQuantity!: ElementRef;
  @ViewChild('errorMessage') private errorMessage!: ElementRef;


  public crearUsuario: FormGroup =  new FormGroup({
    nombre: new FormControl(''),
    password: new FormControl(''),
    admin: new FormControl(false)
  });

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

      this.users = await this.proyects.GetUsers().then((users: User[])=>{return users})
      this.usuariosFront = this.users.map(user => ({ ...user }));
      console.log(this.usuariosFront);
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
      
      if((isSameDay(dia.date, this.viewDate) && this.activeDayIsOpen ) || dia.events.length === 0){
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
      try{
        const errorMessageElement = this.errorMessage.nativeElement as HTMLDivElement;
        errorMessageElement.className = "hidden";
      }catch(error: any){
        
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

  

  public async autoClicked(event: Event){

    

    const clicked = (event.target as HTMLInputElement).checked;

    const currentDate: Date = new Date();

    const fecha =  this.dateStartNPCP.nativeElement as HTMLInputElement;

    let bestStartDate = new Date();

    if(this.plantillaElegida === undefined){
      return
    }

    const updatedUsers: User[] = this.users.map(user => ({
      ...user,
      tareas: user.tareas ? user.tareas.map(t => ({ ...t })) : []
    }));

    bestStartDate = new Date();
    //console.log("usuarios", updatedUsers);

    //console.log("startDate inicial");
    for(let i: number = 0; i < updatedUsers.length; i++){
      if(!updatedUsers[i].disponible){
        continue;
      }
      let tareas = updatedUsers[i].tareas
      if(tareas !== undefined && tareas !== null && tareas.length > 0){
        let candidate: Date = new Date(tareas[0].acaba) 
        if(candidate > bestStartDate){
          bestStartDate = candidate;
        }
      }else{
        bestStartDate = new Date();
        break;
      }

    }

    //console.log(bestStartDate);

    const tareasPlantilla: TareaPlantilla[] = await this.proyects.GetTemplateTasks(this.plantillaElegida!.id);
    
    const linksPlantilla: LinkPlantilla[] = await this.proyects.GetTemplateLinks(this.plantillaElegida!.id);
    
    


    const parsedLinks = linksPlantilla.map((link: LinkPlantilla) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type
    } as Link));

    let asignable:boolean = false;

    while(!asignable){
      const parsedTasks: Task[] = parseTemplateTasksToGanttTasks(tareasPlantilla, bestStartDate);
      const span = this.proyectSpan(parsedTasks);
      
      const ProyectToSave: Proyect = {
        id: Math.floor(Math.random() * 100000000),
        start: format(bestStartDate,'MM-dd-yyyy HH:mm'),
        title: "Nuevo Proyecto",
        end: span.hours,
        color: {
          primary: 'ffffff',
          secondary: 'ffffff'
        }
      };

      let copiaTasks = parsedTasks.map((task:Task)=>{
        return task;
      });
      let copiaLinks = parsedLinks.map((link:Link)=>{
        return link;
      });

       asignable = this.addUsersToTasks(updatedUsers, copiaTasks, ProyectToSave, copiaLinks, tareasPlantilla);

       if(!asignable){
        bestStartDate = new Date(bestStartDate.getTime() + 3600000);
       }
    }

    //console.log("startdate final", bestStartDate);

    //console.log(bestStartDate,format(bestStartDate, "yyyy-MM-dd HH:mm"));

    fecha.value = format(bestStartDate, "yyyy-MM-dd HH:mm");

    /*let events = [...this.events];
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
    }*/
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

  public async parsearPlantilla() {
  const date = (this.dateStartNPCP.nativeElement as HTMLInputElement).value;

  const updatedUsers: User[] = this.users.map(user => ({
    ...user,
    tareas: user.tareas ? user.tareas.map(t => ({ ...t })) : []
  }));

  if (date !== "" || this.plantillaElegida !== undefined) {
    const tareasPlantilla: TareaPlantilla[] = await this.proyects.GetTemplateTasks(this.plantillaElegida!.id);
    const parsedTasks: Task[] = parseTemplateTasksToGanttTasks(tareasPlantilla, new Date(date));
    const linksPlantilla: LinkPlantilla[] = await this.proyects.GetTemplateLinks(this.plantillaElegida!.id);
    
    const parsedLinks = linksPlantilla.map((link: LinkPlantilla) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type
    } as Link));

    const span = this.proyectSpan(parsedTasks);
    const newColor = this.getRandomHexColor();

    const calendarEvent: CalendarEvent = {
      id: Math.floor(Math.random() * 100000000),
      start: new Date(date),
      title: "Nuevo Proyecto",
      end: addHours(date, span.hours),
      color: {
        primary: newColor.color,
        secondary: newColor.dimmed
      }
    };

    const ProyectToSave: Proyect = {
      id: calendarEvent.id as number,
      start: format(calendarEvent.start, 'MM-dd-yyyy HH:mm'),
      end: span.hours,
      title: calendarEvent.title,
      color: {
        primary: calendarEvent.color!.primary,
        secondary: calendarEvent.color!.secondary
      }
    };

    let copiaTasks = parsedTasks;
    let copiaLinks = parsedLinks;

    const asignado = this.addUsersToTasks(updatedUsers, copiaTasks, ProyectToSave, copiaLinks, tareasPlantilla);

    if (!asignado) {
      return;
    }

    // ✅ Asignamos la copia modificada para mostrar en UI
    this.usuariosFront = updatedUsers;

    //console.log(this.users, this.usuariosFront);

    await this.proyects.createProyect(ProyectToSave);
    await this.proyects.SaveProyectTasksandLinks(ProyectToSave.id, parsedTasks, parsedLinks);
    await this.actualizarUsuarios();

    this.users = this.usuariosFront.map(user => ({
      ...user,
      tareas: user.tareas ? user.tareas.map(t => ({ ...t })) : []
    }));

    this.events.push(calendarEvent);
    this.events = [...this.events];
    this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: ProyectToSave.id, name: ProyectToSave.title}});

    }
    else{
      //console.log(date, this.plantillaElegida);
      return;
    }
  }
/*
  private getDependentTaskObjects(task: Task, tasks: Task[], links: Link[]): Task[] {
    const dependentsMap = new Map<number, number[]>();

    for (const link of links) {
      if (!dependentsMap.has(link.source)) {
        dependentsMap.set(link.source, []);
      }
      dependentsMap.get(link.source)!.push(link.target);
    }

    const resultIds = new Set<number>();
    const visited = new Set<number>();
    const stack = [task.id];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = dependentsMap.get(currentId) || [];

      for (const childId of children) {
        resultIds.add(childId);
        stack.push(childId);
      }
    }

    const dependents = tasks.filter(t => resultIds.has(t.id));
    return dependents;
  }
*/
  public elegirPlantilla(plantilla: Plantilla){
    this.plantillaElegida = plantilla;
  }
  private addUsersToTasks(usersForTasks: User[], tasks: Task[], proyect: Proyect, links: Link[], plantillasTarea: TareaPlantilla[]): boolean{


    tasks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    //console.log(this.getDependentTaskObjects(tasks[0], tasks, links));
    for(let j = 0; j < tasks.length; j++){
      let foundCandidates = 0;
      let task = tasks[j];
      let tareaCountPlantilla = plantillasTarea.find((tarea: TareaPlantilla) =>
        tarea.id === task.id
      );
      let userCountPlantilla = tareaCountPlantilla!.user_count;
      
      for(let i = 0; i < usersForTasks.length; i++){
        let user = usersForTasks[i];
        if(!user.disponible){
          continue;
        }
        else if(user.tareas === undefined || user.tareas === null || user.tareas.length === 0){
          
          foundCandidates++;
          user.tareas = [];
          user.tareas.push({tarea: task.text, acaba: format(new Date(new Date(task.start_date).getTime() + task.duration * 60000), "yyyy-MM-dd HH:mm"), pid: proyect.id });
          task.users.push({uname: user.uname});
          
        
        }else if (new Date(user.tareas[0].acaba) <= new Date(task.start_date)) {
          const taskStart = new Date(task.start_date);
          const taskEnd = new Date(taskStart.getTime() + task.duration * 60000);
          const endFormatted = format(taskEnd, "yyyy-MM-dd HH:mm");

          user.tareas.unshift({tarea: task.text,acaba: endFormatted,pid: proyect.id});

          task.users.push({uname: user.uname});
          foundCandidates++;
          
        }

        if(foundCandidates >= userCountPlantilla){
          break;
        }

      }
      if(foundCandidates < userCountPlantilla){
        //console.log(`No hay usuarios para la tarea ${task.text}. Abortar`);
        return false;
      }
    }
    return true;
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
  
  public checkValidCredentials(uname: string, pass: string, admin: boolean): {result: boolean, error: string}{

    
    let invalid: boolean = false;
    let messageText: string = "";

    const regex: RegExp[] = [
    /(?=.*[A-Z])(?=.*[0-9]).{4,}/,
    /^[a-z]+$/
  ]

    if(!regex[1].test(uname)){
      messageText = "El formato de nombre no es correcto";
      invalid = true;
    }
    if(!regex[0].test(pass)){
      if(messageText.length !== 0){
        messageText += "\n";
      }
      messageText += "El formato de contraseña no es correcto";
      
      invalid = true;
    }
    if(invalid){
      return {result: false, error: messageText};
    }
    let duplicateUser: boolean = false;
    this.users.forEach((user: User)=>{
      if(uname === user.uname){
        duplicateUser = true;
      }
    });
    if(duplicateUser){  
      messageText = "El usuario ya existe";
      return {result: false, error: messageText};
    }
    
    return {result: true, error: ""};
  }
  public async uploadNewUser(){
    const uname: string = this.crearUsuario.get("nombre")?.value;
    const pass: string = this.crearUsuario.get("password")?.value;
    const admin: boolean = this.crearUsuario.get("admin")?.value;
    const errorMessageElement = this.errorMessage.nativeElement as HTMLDivElement;

    

    let isValid: {result: boolean, error: string} = await this.checkValidCredentials(uname, pass, admin);

    if(isValid.result){
      const newUser: User = {uname: uname, pass: pass, admin: admin, disponible: false};
      await this.proyects.createUser(newUser);
      this.users.push(newUser);
      this.usuariosFront.push(newUser);
      this.enableView();
    }else{
      errorMessageElement.className = "errorMessage";
      errorMessageElement.innerText = isValid.error;
    }
    

  }
  public async eliminarUsuario(usuario: User, index: number){
    
    await this.proyects.deleteUser(usuario);

    this.users.splice(index, 1);
    this.usuariosFront = this.users.map(user => ({ ...user }));

  }

  public actualizarAdmin(event: Event, index: number){

    const check = event.currentTarget as HTMLInputElement;

    this.usuariosFront[index].admin = check.checked;


  }

    public actualizarDisponible(event: Event, index: number){

    const check = event.currentTarget as HTMLInputElement;

    this.usuariosFront[index].disponible = check.checked;


  }

  public actualizarUsuarios(){
  
    const toCompare = this.users.length;
    //console.log(this.usuariosFront, this.users);


    const ammountToCompare = this.users.length;

    for(let i: number = 0; i < ammountToCompare; i++){
      let index: number = this.users.findIndex((user: User) => user.uname === this.usuariosFront[i].uname && user.pass === this.usuariosFront[i].pass);
      if(index >= 0 && ( this.usuariosFront[i].admin !== this.users[index].admin) || (this.usuariosFront[i].disponible !== this.users[index].disponible) || ((this.usuariosFront[i].tareas?.length ?? 0 )!== (this.users[index].tareas?.length ?? 0))){
        this.proyects.updateUsers(this.users[index], this.usuariosFront[i]);
      }
    }

    //for(let i: number = 0; i < toCompare; i++){
    //  if((this.usuariosFront[i].uname !== this.users[i].uname) || (this.usuariosFront[i].pass !== this.users[i].pass) || (this.usuariosFront[i].admin !== this.users[i].admin) || (this.usuariosFront[i].disponible !== this.users[i].disponible)){
    //    this.proyects.updateUsers(this.users[i], this.usuariosFront[i]);
    //    //console.log("algo está cambiado, esto interesea hacerle update: ",this.usuariosFront[i]);
    //  }
    //}

  }

}
