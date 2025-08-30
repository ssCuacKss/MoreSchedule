/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: schedule-calendar.component.ts
 * Descripción: Componente encargado de la vista y funcionalidades del calendario de proyectos
 * y el menú de acciones.
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 20/04/2025
 * Última modificación: 18/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

import { ChangeDetectorRef, Component, ElementRef, inject, LOCALE_ID, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarModule, CalendarMonthViewDay, CalendarMonthViewBeforeRenderEvent} from 'angular-calendar';
import { SchedulerDateFormatter, SchedulerModule } from 'angular-calendar-scheduler';
import { addHours, addMonths, subMonths, isSameMonth, isSameDay, format, addMinutes, isSaturday, isSunday} from 'date-fns';
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
import { Task } from '../DTO/task';
import { Link } from '../DTO/link';
import { User } from '../DTO/user';
import { CookieService } from 'ngx-cookie-service';
import { fromEvent, Subject } from 'rxjs';
import { event } from 'jquery';



@Component({
  selector: 'app-schedule-calendar',
  imports: [CommonModule ,CalendarModule, SchedulerModule,ReactiveFormsModule],
  template: `
    <!-- bloque de calendario -->
    <div (click)="enableView()" class="mainView">
      <!-- barra de menu -->
      <div class="menu" (mouseleave)="closeAllSubmenus($event)" #nav>
        <ul class="calendarMenu">
          <li (click)="openMenu($event)" class="item" id="menu-one">Gestión de proyectos
            <ul class="closed">
              <li (click)="selectOption('NuevoProyecto')">Nuevo Proyecto</li>
              <!--<li (click)="selectOption('NuevoProyectoSP')">Nuevo Proyecto sin Plantilla</li>-->
            </ul>
          </li>
          <li (click)="openMenu($event)" class="item" id="menu-two">Plantillas de proyectos
            <ul class="closed">
              <li (click)="generarNuevaPlantilla()">Nueva Plantilla</li>
              <li (click)="selectOption('EditarPlantilla')">Editar Plantilla</li>
            </ul>
          </li>
          <li (click)="openMenu($event)" class="item" id="menu-three">Gestión de usuarios
            <ul class="closed" >
              <li (click)="selectOption('CrearUsuario')">Crear Usuario</li>
              <li (click)="selectOption('EditarUsuario')">Editar Usuario</li>
            </ul>
          </li>
          <li (click)="selectOption('CalendarConfig')" class="item" id="menu-four">Configuración de calendario</li>
          <li (click)="selectOption('CerrarSesion')" class="item" id="menu-five">Cerrar Sesión</li>
        </ul>
      </div>
      <!-- botones de calendario -->
      <div class="calendar-controls" #buttons>
        <button id="prevMonth" class="calendarButton" (click)="previousMonth()">Mes<br>anterior</button>
        <p style="width: 7rem; text-align: center;">
          {{viewDate.toLocaleDateString('default', {month: 'long'})}}<br>{{viewDate.getFullYear()}}
        </p>
        <button id="nextMonth" class="calendarButton" (click)="nextMonth()">Mes<br>siguiente</button>
      </div>
      <!-- calendarario -->
      <div style="padding: 1rem;" class="calendar" #calendar>
        <mwl-calendar-month-view 
          [viewDate]="viewDate"
          [events]="events"
          (eventClicked)="goToProyectSchedule($event.event)"
          (dayClicked)="ampliarDia($event.day)"
          [activeDayIsOpen]="activeDayIsOpen"
          [eventActionsTemplate]="eventActionsTpl"
          [refresh]="refresh"
          (beforeViewRender)="beforeMonthViewRender($event)"/>
      </div>
    </div>
    <!-- acciones sobre el proyecto -->
    <ng-template #eventActionsTpl let-event="event" >
        <span id="eventActions">
          <button class="removeProyectButton" id="removeProyect" mwlCalendarAction="delete">
            X
          </button>
          <label id="removeProyectHolder" for="removeProyectImg">
            <img id="removeProyectImg" src="https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fpluspng.com%2Fimg-png%2Fdelete-button-png-delete-icon-1600.png&f=1&nofb=1&ipt=4dabcc6436bdc1eb053d319c244bb71bc1f21238a165543478c5f69b8d1e7a6f" alt="delete button" (click)="eraseProyect(event)">
          </label>
          <button  id="viewProyectSummaryButton">
          </button>
          <label id="viewSummaryHolder">
            <img src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.pngplay.com%2Fwp-content%2Fuploads%2F7%2FChecklist-Logo-Transparent-Image.png&f=1&nofb=1&ipt=503af8392e5e616fdbdc39e84653915bb17e4ff84330a1004d78c9277331916c" id=viewProyectSummaryImg alt="listIconSummary" width="500" height="600" (click)="getProyectData(event); selectOption('ViewSummary')">
          </label>
        </span>
    </ng-template>

    <!-- ventana de dialogo -->
    <div class="dialogDisabled" #dialog>
      <div class="configHeader">    
      <h1 style="margin-left: 20px;">Advertencia</h1>
      <button class="closeButton" (click)="cancelAction()">Cancelar</button>
      </div>
      <p style="margin-left: 25px; margin-right:25px; font-weight: 500">{{confirmDLG}}</p>
      <div id="optionsCerrarSesion">
        <input type="button" value="Aceptar" id="closeSessionButton" style="margin: 20px;" (click)="performAction()">
      </div>
    </div>

    <!-- ventana modal -->
    <div class="configDisabled" #config>
    
      
      <ng-container [ngSwitch]="configOption" >
        <div class="configHeader">
          <h1 class="windowName" #windowName>Sample Text</h1>
          <button class="closeButton" #closeButton (click)="enableView()">Cancelar</button>
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
          <div *ngSwitchCase="'ViewSummary'">
            <ng-container *ngTemplateOutlet="viewSummary"/>
          </div>
          <div *ngSwitchCase="'CerrarSesion'">
            <ng-container *ngTemplateOutlet="cerrarSesion"/>
          </div>
        </div>
        <!-- ventana modal  cerrar sesión-->
        <ng-template #cerrarSesion>
          <h3 style="font-weight: 500">{{"Estás a punto de cerrar sesión. ¿Estás seguro?"}}</h3>
          <div id="optionsCerrarSesion">
            <input type="button" value="Aceptar" id="closeSessionButton" (click)="actionCerrarSesion()">
          </div>
        </ng-template>
        <!-- ventana modal ver resumen -->
        <ng-template #viewSummary>
          <h3>{{calendarEventDatos?.title}}</h3>
          <div id="proyectDataHeaders">
            <h4>
              Tarea
            </h4>
            <h4>
              fecha<br>de<br>Inicio
            </h4>
            <h4>
              Duración<br>(mins)
            </h4>
            <h4>
              Holgura<br>(mins)
            </h4>
            <h4>
              Holgura<br>Usada
            </h4>
            <h4>
              Progreso
            </h4>
          </div>
          <div id="proyectDataField">
            <div id="proyectDataItem" *ngFor="let tarea of proyectoAResumir">
              <p>
                {{tarea.text}}
              </p>
              <p>
                {{tarea.start_date}}
              </p>
              <p>
                {{tarea.duration - tarea.offtime - tarea.slack_used}}
              </p>
              <p>
                {{tarea.slack}}
              </p>
              <p>
                {{tarea.slack_used}}
              </p>
              <p>
                {{tarea.progress*100 | number:'1.0-2'}}%
              </p>
            </div>
          </div>
          <p id="proyectState">Estado: {{proyectStatus}}</p>
        </ng-template>

        <!-- ventana modal ver configuración de calendario-->
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
          </div>
          <div class="hidden" #errorMessageAddFechas style="width: 96%; "></div>
          <div id="saveChangesButtonDiv">
            <input type="button" value="Guardar cambios" id="saveCalendarConfig" #saveCalendarConfig (click)="saveConfig()">
            </div>
      </ng-template>
      <!-- ventana modal creación de usuario-->
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
  <!-- ventana modal edicion de usuario-->
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
            <input type="button" value="eliminar" (click)="eliminarUsuario(user)" >
            <div id="operatorTasks" *ngIf="(user.disponible && user.tareas !== undefined && user.tareas !== null && user.tareas.length !== 0)">
            <div class="tareasEnLinea">
              <div *ngFor="let tarea of user.tareas; index as j">
                <span (click)="goToUserTask(tarea)">[Tarea: {{tarea.tarea}} - termina: {{tarea.acaba}}]</span>
              </div>
            </div>
            </div>
          </div>
        </div>
        <div class="hidden" #errorMessageEraseUser style="width: 96%;"></div>
        <input type="button" value="agregar" class="confirmChanges" (click)="wrapperActualizarUsuarios()">

      </ng-template>
    <!-- ventana modal edicion  de plantilla-->
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
      <!-- ventana modal creación de proyecto-->
      <ng-template #newProyect>
      <h3>Plantillas</h3>
        <div class="listSelect">
              <div class="templateSelect" *ngFor="let plantilla of plantillas; index as i" [class.selectedTemplate]="plantillaElegida?.id === plantilla.id">
                  <h4>{{plantilla.title}}</h4>
                  <input type="button" value="Usar Plantilla" id="editar" (click)="elegirPlantilla(plantilla)">
              </div>
        </div>
        <div class="dateStartSelector">
          <input type="checkbox" #checkAuto id="autoDate" (click)="autoClicked()">
          <label for="autoDate">selección de fecha automática</label>
          <input type="datetime-local" #NPDateStart>
        </div>
        <div class="hidden" #errorMessageCreateProyect style="width: 96%;"></div>
        <div id="quantity">
          <input type="button" id="quantitySelector" #proyectAddFromTemplate value="Crear Proyecto" (click)="parsearPlantilla()">
        </div>
        
      </ng-template>
      <!-- ventana modal creación de proyecto sin plantilla (no usado)-->
      <ng-template #newProyectNP>
      <h3>Plantillas</h3>
        <div id="proyectNameInput">
              <h4>Nombre de Proyecto:</h4>
              <input type="text" #textInputProyectName id="inputName" #NPSPName>
        </div>
        <div class="dateStartSelector">
          <input type="checkbox" id="autoDate" (click)="autoClicked()">
          <label for="autoDate">selección de fecha automática</label>
          <input type="datetime-local" #NPSPDateStart>
        </div>
        <div id="newProyectSPbutton">
          <input type="button" id="iniciarProyecto" value="Iniciar Proyecto" (click)="iniciarProyecto()">
        </div>
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


/**
 * Clase encargada de inicializar y configurar el calendario y vistas y acciones principales de interacción con el sistema; 
 * 
 * 
 * 
*/
export class ScheduleCalendarComponent implements OnInit, OnDestroy{

  //fecha en la que iniciar el calendario
  public viewDate: Date = new Date();
  //comprobante para abrir los proyectos de un dia
  public activeDayIsOpen: boolean = false;
  //servicio del DOM
  private document: Document = inject(DOCUMENT);
  //servicio de router de angular
  private router: Router = inject(Router);
  //servicio de cookies de angular
  private cookie: CookieService = inject(CookieService);
  //candado para evitar fusión de eventos al cerrar o abrir opciones del menú
  private lock: boolean = false;
  //opción elegida en un submenú
  public configOption: string = "";
  //servicio de acceso a la API
  private dbDao: dbDAO = inject(dbDAO);
  //servicio de detección de cambios en elementos del DOM
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  //configuracion del calendario a recuperar del servidor
  public calendarConfigData!: CalendarConfig;
  //configuración del calendario anterior a una actualización
  private calendarConfigDataOld!: CalendarConfig;
  //plantillas de proyecto recuperadas del servidor
  public plantillas!: Plantilla[];
  //usuarios de la aplicación recuperadas del servidor
  private users!: User[];
  //usuarios salvaguarda que representan la información de usuarios manipulada en el frontend
  public usuariosFront!: User[];
  //plantilla elegida para un proyecto
  public plantillaElegida?: Plantilla = undefined;
  //proyecto a resumir
  public calendarEventDatos?: CalendarEvent = undefined;
  //tareas del proyecto a resumir
  public proyectoAResumir: Task[] = [];
  //estado del proyecto resumido
  public proyectStatus: string = "";
  //texto de la ventana de confirmación
  public confirmDLG: string = "";
  //texto de la ventana de diálogo
  public actionDLG: string = "";
  //Observable asignado a la actualización de proyectos en el calendario
  public refresh: Subject<void> = new Subject();
  //identificador del temporizador de refresco
  private timerID = 0;
  //proyectos de la aplicacón recuperados del servidor
  public events: CalendarEvent[] = [];

  //referencia al contenedor que contiene la ventana modal de configuración
  @ViewChild("config") private config!: ElementRef;
  //referncia al contenedor del menú de la vista
  @ViewChild("nav") private nav!: ElementRef;
  //referencia al contenedor de los botones que cambian el mes mostrado en el calenario
  @ViewChild("buttons") private buttons!: ElementRef;
  //referencia al elemento de calendario
  @ViewChild("calendar") private calendar!: ElementRef;
  //referencia al botón de cierre de la ventana modal de configuración
  @ViewChild("closeButton") private closeButton!: ElementRef;
  //referencia al elemento que contiene la fecha de finalización de periodo festivo
  @ViewChild('fecha2') private fechaFin!: ElementRef;
  //referencia al elemento que contiene la fecha de inicio de periodo festivo
  @ViewChild('fecha1') private fechaInicio!: ElementRef;
  //referencia al elemento que contiene la hora de entrada laboral
  @ViewChild('entrada') private entrada!: ElementRef;
  //referencia al elemento que contiene la hora de salida laboral
  @ViewChild('salida') private salida!: ElementRef;
  //referencia al elemento que contiene el nombre de un nuevo proyecto sin plantilla
  @ViewChild('NPSPName') private entradaNPSP!: ElementRef;
  //referencia al elemento que contiene la fecha de inicio de un nuevo proyecto sin plantilla
  @ViewChild('NPSPDateStart') private dateStartNPSP!: ElementRef;
  //referencia al elemento que contiene la fecha de inicio de un nuevo proyecto a partir de una plantilla
  @ViewChild('NPDateStart') private dateStartNPCP!: ElementRef;
  //referencia al elemento en el que se insertará el mensaje de error de creación de nuevo usuario
  @ViewChild('errorMessage') private errorMessage!: ElementRef;
  //referencia al elemento en el que se insertará el mensaje de error de creación de nuevo proyecto
  @ViewChild('errorMessageCreateProyect') private errorMessage2!: ElementRef;
  //referencia al elemento en el que se insertará el mensaje de error de eliminación de un usuario
  @ViewChild('errorMessageEraseUser') private errorMessage3!: ElementRef;
  //referencia al elemento en el que se insertará el mensaje de error al eliminar un festivo
  @ViewChild('errorMessageAddFechas') private errorMessage4!: ElementRef;
  //referencia al elemento en el que se obtiene el permiso para la asignación automática de fechas al crear un proyecto
  @ViewChild('checkAuto') private checkAuto!: ElementRef;
  //referencia al elemento que contiene la ventana de dialgo para avisos al usuario
  @ViewChild('dialog') private dialog!: ElementRef;


  //formgroup que gestiona los datos en el formulario de creación de usuarios
  public crearUsuario: FormGroup =  new FormGroup({
    nombre: new FormControl(''),
    password: new FormControl(''),
    admin: new FormControl(false)
  });


  constructor(){
    registerLocaleData(localeEs);
    if(this.cookie.get('LoginCookie').valueOf() !== 'ALLOWEDTOLOGIN'){
      this.router.navigate(['/'])
    }

  }

  /**Función encargada de renderizar ciertos elementos extra en el calendario (medalla indicadora de proyectos y marcación de festividad)
   * 
   * @param {CalendarMonthViewBeforeRenderEvent} ev evento que dispara el ajuste de la vista previa al ajuste
   * 
  */

  beforeMonthViewRender(ev: CalendarMonthViewBeforeRenderEvent) {
    for (const day of ev.body) {
      const titles = (day.events ?? []).map(e => String(e.title ?? ''));

      const hasBlock = titles.some(t => t.includes('⛔'));
      const hasWarn  = titles.some(t => t.includes('⚠️'));

      (day as any).emoji = hasBlock ? '⛔' : (hasWarn ? '⚠️' : ''); 

      const extra = (hasBlock ? ' has-block' : (hasWarn ? ' has-warn' : ''));
      day.cssClass = (day.cssClass || '') + extra;
  
      const fechaCelda = new Date(day.date);
      fechaCelda.setHours(0, 0, 0, 0);

      const esFestivo = this.calendarConfigData?.festivos.some((festivo: any) => {
        const inicio = new Date(festivo.diaInicio);
        inicio.setHours(0, 0, 0, 0);

        const fin = festivo.diaFin ? new Date(festivo.diaFin) : new Date(inicio);
        fin.setHours(0, 0, 0, 0);

        return fechaCelda.getTime() >= inicio.getTime() &&
              fechaCelda.getTime() <= fin.getTime();
      });

      if (esFestivo) {
        day.cssClass = (day.cssClass || '') + ' festivo-day';
      }
    }
  }

  /**
   * Función onDestroy, al destruir el elemento angular se realiza la acción de limpiar los temporizadores 
   * 
   * 
  */

  async ngOnDestroy(): Promise<void> {
      window.clearInterval(this.timerID);
  } 

  /**
   * Función onInit, al inicial el alemento angular se crea un temporizador que ejecuta acciones regularmente
   * 
   * 
  */

  async ngOnInit(): Promise<void> {

    await this.refreshData();
    this.timerID = window.setInterval(async() => {
        await this.refreshData();
        this.cdr.detectChanges();
    }, 5 * 60000);

  }
  
  /**
   * Obtiene y guarda todas las plantillas, proyectos y usuarios de la aplicación para guardarlos en las variables de clase.
   * ademas inicia la representación de los retrasos en proyectos
   * 
   * 
  */

  public async refreshData(){
        this.plantillas = await this.dbDao.GetTemplates().then((plantillas: Plantilla[]) =>{
      return plantillas;
    });

    let downloadedEvents = await this.downloadEvents();
    await this.initiateGraphicCues(downloadedEvents);
    this.events = downloadedEvents;
    this.calendarConfigData = await this.dbDao.GetCalendarConfig().then((config: CalendarConfig) => {
      return config;
    });

    this.users = await this.dbDao.GetUsers().then((users: User[])=>{return users})
    this.usuariosFront = this.users.map(user => ({ ...user }));
    //console.log(this.usuariosFront);
    this.refresh.next();
    
  }

    /**
   * Función que obtiene y guarda en las variables de clase los proyectos de la aplicación
   * 
   * 
  */

  async downloadEvents(){
    let dbproyects = await this.dbDao.GetProyects();
    return dbproyects ?? [];
  }

  /**
   * Función que mueve la vista del calendario al mes siguiente
   * 
   * 
  */

  previousMonth(): void {
    this.viewDate = subMonths(this.viewDate, 1);
  }

  /**
   * Función que mueve la vista del calendario al mes anterior
   * 
   * 
  */
  
  nextMonth(): void {
    this.viewDate = addMonths(this.viewDate, 1);
  }

  /**
   * Función que muestra los proyectos que están activos en un dia seleccionado
   * 
   * 
  */


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

  /**
   * Función que redirige a la vista de la tabla gantt de un proyecto
   * 
   * 
  */

  public goToProyectSchedule(event: CalendarEvent): void {

    this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: event.id, name: event.title}});

  }

  /**
   * Función que inicia las pistas gráficas de los proyectos de un dia seleccionado en el calendario
   * 
   * @param {CalendarEvent[]} proyects Array de proyectos activos en un dia de la aplicación
   * 
  */

  private async initiateGraphicCues(proyects: CalendarEvent[]){

    const currentDate = new Date();
    for (let event of proyects){
      let id: number = event.id as number;
      let warn = false;
      let block = false;

      let tasks: Task[] = await this.dbDao.GetProyectTasks(id).then((tasksDB:Task[]) => {return tasksDB});
      for(let task of tasks){
        const endDate = new Date(new Date(task.start_date).getTime() + (task.duration * 60000));
        
        if(task.slack_used > 0 && task.progress < 1 && this.proyectStatus !== "Retrasado" ){
          warn = true;
        }
        if(task.slack < task.slack_used || endDate < currentDate){
          block = true;
          break;
        }
      }
      const prefix = block ? '⛔' : (warn ? '⚠️' : '');
      event.title = prefix + event.title;
    }
  }

  /** 
   * 
   * Función para generar el resultado de la ventana de acciones de sus botones
   * 
   */

  private dialogResolver?: (v: boolean) => void;

    /** 
   * 
   * Función para mostrar la ventana de diálogo.
   * @param {string} msg mensaje de texto a mostrar en la ventana de dialogo
   * 
   */

  public async openDialog(msg: string): Promise<boolean> {
    this.confirmDLG = msg;
    (this.dialog.nativeElement as HTMLElement).className = 'dialogPanel';
    return new Promise<boolean>(resolve => (this.dialogResolver = resolve));
  }

      /** 
   * 
   * Función para devolver resultado negativo en la ventana de diálogo
   * 
   */

  public cancelAction() {
    (this.dialog.nativeElement as HTMLElement).className = 'dialogDisabled';
    this.dialogResolver?.(false);
    this.dialogResolver = undefined;
  }

       /** 
   * 
   * Función para devolver resultado positivo en la ventana de diálogo
   * 
   */

  public performAction() {
    (this.dialog.nativeElement as HTMLElement).className = 'dialogDisabled';
    this.dialogResolver?.(true);
    this.dialogResolver = undefined;
  }


  /**
   * Función que tras la selección de una opción del menú, muestra su submenú de opciones
   * 
  */

  public openMenu(event: Event): void{
    // se obtiene el contenedor del submenú
    const element = (event.currentTarget as HTMLLIElement)
    const selectable = element.querySelector('ul');
    let menuItems = this.document.querySelectorAll('.item');
   // se cierran el resto de submenus
    menuItems.forEach(item => {
      if(item.id !== element.id){
        let submenu = item.querySelector("ul");
        if(submenu){
          submenu.className = "closed";
        }
      }
    });
    // se abre el submenu del menú elegido
    if(selectable){
      if(selectable.className === "closed"){
        selectable.className = "dropdown";
      }else{
        selectable.className = "closed";
      }
    }
  }

  /**
   * Función que cierra el submenú de la aplicación seleccionado
   * 
  */

  public closeMenu(event: Event): void{
    const subMenu = event.target as HTMLUListElement;
    if(subMenu.className !== "closed"){
      subMenu.className = "closed";
    }
  }

  /**
   * Función que cierra todos los submenus
   * 
  */

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

  /**
   * Función que abre la ventana modal seleccionada
   * 
  */

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
      case 'ViewSummary':{
        windowName!.textContent = "Resumen de Proyecto";
        break;
      }
      case 'CerrarSesion':{
        windowName!.textContent = "Advertencia";
        break;
      } 
      default: {
        windowName!.textContent = "NoOPT";
      }
    }

  }

  /**
   * Función que cierra la ventana modal actual y rehabilita la vista del calendario
   * 
   * 
  */

  public async enableView(): Promise<void>{
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
      this.calendarConfigData = await this.dbDao.GetCalendarConfig().then((config: CalendarConfig) => {
        return config;
      });
      if(configBody){
        configBody.className = "configBodyDisabled";
      }
      try{
        const errorMessageElement = this.errorMessage.nativeElement as HTMLDivElement;
        const errorMessageElement2 = this.errorMessage2.nativeElement as HTMLDivElement;
        const errorMessageElement3 = this.errorMessage3.nativeElement as HTMLDivElement;
        const errorMessageElement4 = this.errorMessage4.nativeElement as HTMLDivElement;
        errorMessageElement.className = "hidden";
        errorMessageElement2.className = "hidden";
        errorMessageElement3.className = "hidden";
        errorMessageElement4.className = "hidden";
      }catch(error){

      }
      closeButton.setAttribute("disabled", "");
    }
  }

  /**Función que obtiene un color hexadecimal aleatorio y su versión atenuada
   * 
   * @returns {color: string, dimmed: string} el color hexadecimal elegido y su version atenuada, ambas como strings
  */

  getRandomHexColor(): { color: string; dimmed: string } {

    const randomInt = Math.floor(Math.random() * 0x1000000);
    const color = `#${randomInt.toString(16).padStart(6, '0')}`.toUpperCase();

    const dimmed = this.lightenColor(color, 0.6);
    return { color, dimmed };
  }

  /**
   * Función que atenua un color hexadecimal un porcentaje
   * @param {string} hex color cadena de caracteres que representan un numero hexadecimal
   * @param {number} percent porcentaje a atenuar el color
   * 
   * @returns {string} la cadena de caracteres que representa un numero hexadecimal
   */

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

  /**
   * Función que dada una fecha, devuelve su versión ISO
   * @param {string | undefined} usDate fecha en cualquier fomato reconocible por Date;
   * @returns fecha como cadena en formato ISO
   * 
  */

  public formatDateToISO(usDate: string | undefined): string | undefined {
    if(usDate !== undefined){
      
    // Nos aseguramos de tener dos dígitos en mes y día
      return format(new Date(usDate), "yyyy-MM-dd");
      
    }else{
      return undefined;
    }  
  }

  /**
   * Función que habilita el campo de finalización de periodo vacacional
   * @param {Event} event evento que dispara la ejecución
   * 
   * 
  */

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

  /**
   * Función que guarda la configuración del calendario bajo demanda
   * 
  */

  public async saveConfig(){

    const msgNoDelete = this.errorMessage4.nativeElement as HTMLElement;
    const eventNamesActual: {name: string, offdays: number}[] = [];
    const eventNamesOld: {name: string, offdays: number}[] = [];

    const original = await this.dbDao.GetCalendarConfig().then(t => t);
    this.calendarConfigDataOld = original;

    // obtenemos las festividades por las que pasan los proyectos que pasan por festividades actualmente y en el calendario antiguo

    const proyectosFuturos = this.events.filter( (proyect:any) => {
            const startTime = new Date(proyect.start).getTime();
            const endTime = startTime + proyect.end  * 3600000;
            return new Date().getTime() <= endTime;
        })

    proyectosFuturos.forEach((event: CalendarEvent)=>{
      let counterActual = this.contarFestivos(event.start, event.end as Date, false);
      if(counterActual > 0){
        eventNamesActual.push({name: event.title, offdays: counterActual});
      }
    })

    proyectosFuturos.forEach((event: CalendarEvent)=>{
      let counterOld = this.contarFestivos(event.start, event.end as Date, true);
      if(counterOld > 0){
        eventNamesOld.push({name: event.title, offdays: counterOld});
      }
    });

    // comprobamos si en ambos horarios tienen los mismos proyectos o hay cambios en los festivos que pasan

    const changesInProyectFestivities = () => {
      if(eventNamesOld.length !== eventNamesActual.length){
        return true;
      }else{
        for(let i = 0; i < eventNamesActual.length ; i++){
          if(eventNamesActual[i].name !== eventNamesOld[i].name || eventNamesActual[i].offdays !== eventNamesOld[i].offdays){
            return true;
          }
        }
      }
      return false;
    }


    const entrada = (this.entrada.nativeElement as HTMLInputElement).value;
    const salida = (this.salida.nativeElement as HTMLInputElement).value;

    if(entrada !== "" && salida !== ""){
      this.calendarConfigData.entrada = entrada;
      this.calendarConfigData.salida = salida;
    }

    // comprobamos si hay motivos para guardar los cambios y avisamos al usuario

    let msg = "Está a punto de guardar los cambios en el horario, ¿Está seguro?";
    if (original.entrada !== this.calendarConfigData.entrada ||original.salida !== this.calendarConfigData.salida || this.differencesInDates(this.calendarConfigData.festivos, original.festivos)){
      // se notifica al usuario si existe riesgo de cambiar la planificación actual de los proyectos en caso de hacer cambios en las festividades 
      if(changesInProyectFestivities()){
        msg += " Los cambios en los periodos festivos afectarán a la planificación de proyectos existentes";
      }

      const ok = await this.openDialog(msg);
      if(!ok){ 
        msgNoDelete.className = "hidden";
        msgNoDelete.innerText = "";  
        return;
      };
    }

    await this.dbDao.updateCalendarConfigPromise(this.calendarConfigData);

    msgNoDelete.className = "validMessage";
    msgNoDelete.innerText = `Los cambios fueron guardados correctamente`;
    
    await this.refreshData();
  }

    private differencesInDates(array1: any[], array2: any[]): boolean{
      if(array1.length === array2.length){
          for(let i = 0; i < array1.length; i++){
            if((array1[i].diaInicio !== array2[i].diaInicio) || ((array1[i]?.diaFin ?? "") !== (array2[i]?.diaFin ?? ""))){
              return true;
            }
          }
      }else{
        return true;
      }
      return false;
    }

   /**
   * Función que añade una fecha festiva a la configuración del calendario
   * 
   */

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

  /**
    * función que elimina una fecha o periodo festivo de la configuración del calendario
    * 
    * @param {Event} event evento que dispara la ejecución
    * 
  */

  public eraseDate(event: Event){
    const msgNoDelete = this.errorMessage4.nativeElement as HTMLElement;
    const eventNames: string[] = [];

    this.events.forEach((event: CalendarEvent)=>{
      let counter = this.contarFestivos(event.start, event.end as Date);
      if(counter > 0){
        eventNames.push(event.title);
      }
    })
    /* 
    if(eventNames.length === 1){
      msgNoDelete.className = "errorMessage";
      msgNoDelete.innerText = `No se puede borrar el periodo, un proyecto pasa por el.`;
      return;
    }else if(eventNames.length > 1){
      msgNoDelete.className = "errorMessage";
      msgNoDelete.innerText = `No se puede borrar el periodo, ${eventNames.length} proyectos pasa por el.`;
    }
    */
    const listIndex = parseInt((event.target as HTMLElement).id);
    this.calendarConfigData.festivos.splice(listIndex, 1);
  }

   /**
    * Función que comprueba si el calculo automático de plazos de proyecto está disponible o si si es valido para una fecha dada, 
    * requiere de una plantilla seleccionada y usuarios disponibles para dicha fecha
    * 
    * 
  */  

  public async autoClicked(){

    const clicked = this.checkAuto.nativeElement as HTMLInputElement;
    const errorMessageElement = this.errorMessage2.nativeElement as HTMLDivElement;
    //const clicked = (event.target as HTMLInputElement);


    const currentDate: Date = new Date();

    const fecha =  this.dateStartNPCP.nativeElement as HTMLInputElement;

    let bestStartDate = new Date();

    //si la opción ha sido desmarcada elimina la información del campo

    if( clicked.checked === false){
      errorMessageElement.className = "hidden";
      errorMessageElement.innerText = "";
      fecha.value = "";
      return;
    }

    /**si no hay plantilla seleccionada notifica al usuario*/

    if(this.plantillaElegida === undefined){
      errorMessageElement.className = "errorMessage";
      errorMessageElement.innerText = "No hay una plantilla de proyecto elegida.";
      
      clicked.checked = false;
      return;
    }
    clicked.checked = true;
    errorMessageElement.className = "hidden";
    errorMessageElement.innerText = "";
    const updatedUsers: User[] = this.users.map(user => ({
      ...user,
      tareas: user.tareas ? user.tareas.map(t => ({ ...t })) : []
    }));

    bestStartDate = new Date();
    //console.log("usuarios", updatedUsers);

    //console.log("startDate inicial");
    /**conseguimos la fecha mas temprana posible en la que un usuario se queda libre, la menor de esta fecha es la mejor fecha de inicio posible*/
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

    const tareasPlantilla: TareaPlantilla[] = await this.dbDao.GetTemplateTasks(this.plantillaElegida!.id);
    
    const linksPlantilla: LinkPlantilla[] = await this.dbDao.GetTemplateLinks(this.plantillaElegida!.id);
    
    


    const parsedLinks = linksPlantilla.map((link: LinkPlantilla) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type
    } as Link));

    let copiaTasks: Task[] = []

    let asignable:boolean = false;

    /** se comprueba si la fecha de inicio es válida, si no lo es, elegimos otra fecha de inicio posterior (casi nunca se ejecuta mas de una vez)*/
    while(!asignable){
      const parsedTasks: Task[] = this.parseTemplateTasksToGanttTasks(tareasPlantilla,parsedLinks ,bestStartDate);
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

      copiaTasks = parsedTasks.map((task:Task)=>({
        ...task,
        users: [...task.users.map(user => ({ ...user }))]
      }));
      let copiaLinks = parsedLinks.map((link:Link)=>{
        return link;
      });

       asignable = this.addUsersToTasks(updatedUsers, copiaTasks, ProyectToSave, copiaLinks, tareasPlantilla);

       if(!asignable){
        bestStartDate = new Date(bestStartDate.getTime() + 3600000);
       }
    }

    bestStartDate = this.proyectSpan(copiaTasks).startDate;

    fecha.value = format(bestStartDate, "yyyy-MM-dd HH:mm");


  }

  /**
   * 
   * Función que inicia un nuevo proyecto sin plantilla y redirige a la vista para su edición en la tabla gantt
   * 
   * */

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
      
      await this.dbDao.createProyect(ProyectToSave);
      this.events = [...this.events, calendarEvent];
      //console.log(this.events);
      this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: ProyectToSave.id, name: ProyectToSave.title}});
    }

  }

  /**
   * Función que elimina un proyecto si está permitido su borrado
   * 
   * @param {CalendarEvent} event proyecto del calendario que se desea borrar
   * 
  */

  public async eraseProyect(event: CalendarEvent) {
    const proyectId: number = event.id as number;

    // no bloquea la ejecución si todos tienen indexUltimaTarea === 0 o indexUltimaTarea = x y x no precede a la primera tarea de otro proyecto
    const usersInProyect = this.getUsuariosConUltimaTareaEnProyecto(proyectId);
    let alguienBloquea = false ;
    for(let user of usersInProyect ){
      if(user.indexUltimaTarea !== 0){
        const nextIndex = user.indexUltimaTarea - 1;
        const nextProyectId = user.usuario.tareas[nextIndex].pid;
        const nextProyectTaskId = user.usuario.tareas[nextIndex].tid;
        let tasks:Task[] = await this.dbDao.GetProyectTasks(nextProyectId).then(t => t);
        if(tasks[0].id !== nextProyectTaskId){
          alguienBloquea = false;
        }else{
          alguienBloquea = true;
          break;
        }
      }
    }

    if (alguienBloquea) {
      await this.openDialog(
        `No se puede eliminar el proyecto "${event.title}". Otros proyectos dependen de él.`
      );
      return;
    }

    //Confirmación
    const ok = await this.openDialog(
      `Está a punto de borrar el proyecto ${event.title}.\n` +
      `Esta opción no se puede deshacer.\n¿Desea continuar?`
    );
    if (!ok) return;

    // Borrado de las tareas del proyecto en usuarios
    //    Trabajamos sobre usuariosFront 
    const updatedUsers: User[] = this.usuariosFront.map(user => ({
      ...user,
      tareas: (user.tareas ?? []).filter(t => t.pid !== proyectId)
    }));

    // Mantener el invariante de la pila: índice 0 = tarea más futura
    updatedUsers.forEach(u => {
      if (u.tareas?.length) {
        u.tareas.sort(
          (a, b) => new Date(b.acaba).getTime() - new Date(a.acaba).getTime()
        );
      }
    });

    this.usuariosFront = updatedUsers;
    await this.actualizarUsuarios();


    const idx = this.events.findIndex(e => e.id === proyectId);
    if (idx >= 0) this.events.splice(idx, 1);


    await this.dbDao.deleteAllByPidPromise(proyectId);
    await this.dbDao.deleteProyectByPidPromise(proyectId);

    // Refrescar vista
    this.events = [...this.events];
  }


    /**
   * Función que elimina una plantilla
   * 
   * @param {CalendarEvent} element plantilla que se desea borrar
   * 
  */

  public async eliminarPlantilla(element: Plantilla){

    let ok = await this.openDialog(`Está a punto de eliminar la plantilla "${element.title}".\n Esta acción no se puede deshacer, ¿Está seguro?`);

    if(!ok){
      return;
    }

    const index = this.plantillas.indexOf(element);
    this.plantillas.splice(index,1);

    this.plantillas = [...this.plantillas];

    await this.dbDao.deleteTemplateAllByPidPromise(element.id);
    await this.dbDao.deleteTemplateByTidPromise(element.id);

  }

  /**
   * Función que genera y guarda una nueva plantilla bajo demanda y permite su inmediata edición
   * 
  */

  public async generarNuevaPlantilla(){
    let plantilla: Plantilla;

    const index = Math.ceil(Math.random() * 10000000);

    plantilla = {title: "Nueva Plantilla", end: 0, id: index};

    await this.dbDao.createTemplate(plantilla);

    this.router.navigate(['/proyectSchdedule'], {queryParams:{id: plantilla.id ,title: "EditarPlantilla"}});

  }

  /**
   * Función que elimina la cookie de sesión del usuario y redirecciona a login
   * 
  */

  public async actionCerrarSesion(){

      this.cookie.delete('LoginCookie'); 
      this.router.navigate(['/']);
  }

   /**
   * Función que redirige a la vista de edición de plantillas de proyectos
   * 
   * @param {Plantilla} plantilla plantilla que se desea editar
   * 
  */

  public editarPlantilla(plantilla: Plantilla){
    this.router.navigate(['/proyectSchdedule'], {queryParams:{id: plantilla.id ,title: "EditarPlantilla"}});
  }
  
  /**
   * Función que permite crear un nuevo proyecto a partir de una plantilla, reajustando las fechas a la jornada y dias de trabajo oficiales
   * 
  */

  public async parsearPlantilla() {
  let date = (this.dateStartNPCP.nativeElement as HTMLInputElement).value;
  const errorMessageElement = this.errorMessage2.nativeElement as HTMLDivElement;


  // se obtienen los usuarios de la aplicación
  const updatedUsers: User[] = this.users.map(user => ({
    ...user,
    tareas: user.tareas ? user.tareas.map(t => ({ ...t })) : []
  }));

  if(date === ""){
    errorMessageElement.innerText = "No hay una fecha seleccionada para la plantilla.";
    errorMessageElement.className = "errorMessage";
    return;
  }

  // si hay una plantilla y una fecha realizamos la conversión a proyecto con un plazo
  if (date !== "" || this.plantillaElegida !== undefined) {
    const tareasPlantilla: TareaPlantilla[] = await this.dbDao.GetTemplateTasks(this.plantillaElegida!.id);
    
    const linksPlantilla: LinkPlantilla[] = await this.dbDao.GetTemplateLinks(this.plantillaElegida!.id);
    
    const parsedLinks = linksPlantilla.map((link: LinkPlantilla) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type
    } as Link));
    const parsedTasks: Task[] = this.parseTemplateTasksToGanttTasks(tareasPlantilla, parsedLinks,new Date(date));
    
    const span = this.proyectSpan(parsedTasks);
    const newColor = this.getRandomHexColor();

    const calendarEvent: CalendarEvent = {
      id: Math.floor(Math.random() * 100000000),
      start: new Date(date),
      title: "Nuevo Proyecto",
      end: new Date(new Date(date).getTime() + span.hours *3600000),
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
    //comprobamos si dada la  fecha es posible asignar un proyecto a los usuarios de la aplicación
    const asignado = this.addUsersToTasks(updatedUsers, copiaTasks, ProyectToSave, copiaLinks, tareasPlantilla);

    this.usuariosFront = updatedUsers;

    //console.log(this.users, this.usuariosFront);

    await this.dbDao.createProyect(ProyectToSave);
    await this.dbDao.SaveProyectTasksandLinks(ProyectToSave.id, parsedTasks, parsedLinks);
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
      errorMessageElement.innerText = "No hay ninguna plantilla de proyectos seleccionada";
      errorMessageElement.className = "hidden";
      return;
    }
  }


  /** Función que al recibir una tarea asignada a un usuario, redirije a la vista de edición del proyecto al que pertenece la tarea
   * ademas de abrir la ventana de configuración de dicha tarea para ver sus características.
   * 
   * @param tarea tarea asignada a un usuario que se desea ver
  */

  public goToUserTask(tarea: any){
    this.router.navigate(['/proyectSchdedule'],{queryParams:{title: 'verProyecto', id: tarea.pid, name: "", tarea: tarea.tid}});
  }

    /**
     * Función que marca una plantilla como elegida paraa crear un proyecto a partir de ella.
     * 
    */

  public elegirPlantilla(plantilla: Plantilla){

    
    if((this.plantillaElegida === undefined) || (this.plantillaElegida.id !== plantilla.id)){
      this.plantillaElegida = plantilla;
      // Si el campo de selección automatica está marcado, se elije automatiamente la mejor fecha de inicio
      this.autoClicked();
      //console.log("la plantilla ha cambiado");
      //date.value = "";
    }
  
  }

  /**
   * Función que asigna usuarios a tareas dentro de un proyecto
   * 
   * @param usersForTasks usuarios de la aplicación
   * @param tasks tareas del proyecto
   * @param links enlaces entre tareas del proyecto (no usado)
   * @param plantillasTarea tareas de la plantilla de la que vienen las tareas parseadas
   * 
   * @return {boolean} comprobante de si la asignación se realizó con exito
   * 
  */

  private addUsersToTasks(usersForTasks: User[], tasks: Task[], proyect: Proyect, links: Link[], plantillasTarea: TareaPlantilla[]): boolean{
    tasks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    //console.log(this.getDependentTaskObjects(tasks[0], tasks, links));
    // Recorremos las tareas del proyecto
    for(let j = 0; j < tasks.length; j++){
      let foundCandidates = 0;
      let task = tasks[j];
      let tareaCountPlantilla = plantillasTarea.find((tarea: TareaPlantilla) =>
        tarea.id === task.id
      );
      // Mientras no se hayan asignado el minimo de usuarios para una tarea, comprobar si hay usuarios disponibles para ella
      let userCountPlantilla = tareaCountPlantilla!.user_count;
      
      for(let i = 0; i < usersForTasks.length; i++){
        let user = usersForTasks[i];
        if(!user.disponible){
          continue;
        }
        else if(user.tareas === undefined || user.tareas === null || user.tareas.length === 0){
          
          foundCandidates++;
          user.tareas = [];
          user.tareas.push({tarea: task.text, acaba: format(new Date(new Date(task.start_date).getTime() + task.duration * 60000), "yyyy-MM-dd HH:mm"), pid: proyect.id, tid: task.id});
          task.users.push({uname: user.uname});
          
        
        }else if (new Date(user.tareas[0].acaba) <= new Date(task.start_date)) {
          const taskStart = new Date(task.start_date);
          const taskEnd = new Date(taskStart.getTime() + task.duration * 60000);
          const endFormatted = format(taskEnd, "yyyy-MM-dd HH:mm");

          user.tareas.unshift({tarea: task.text,acaba: endFormatted,pid: proyect.id, tid: task.id});

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


  /**
   * Función que calcula la duración de un proyecto
   * 
   * @param {Task[]} tareas tareas del proyecto
   * 
   * @returns {startDate: Date, hours: number} fecha de inicio del proyecto y horas de duración del mismo
   * 
  */

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

  /**
   * Obtiene la información resumida de un proyecto, deduce si el va conforme lo esperado, si hay riesgo de restraso, o si se ha retrasado
   * 
   * @param {CalendarEvent} event proyecto que se desea resumir 
  */

  public async getProyectData(event: CalendarEvent): Promise<void>{
    this.calendarEventDatos = event;
    const pid = event.id;
    const currentDate = new Date();
    if(pid !== undefined){
      this.proyectoAResumir = await this.dbDao.GetProyectTasks(pid as number).then((tasks: Task[])=>{
        return tasks;
      });
      //console.log(this.proyectoAResumir);
      this.proyectStatus = "En Tiempo";
      for(let i: number = 0; i < this.proyectoAResumir.length; i++){
        const task = this.proyectoAResumir[i];
        const endDate = new Date(new Date(task.start_date).getTime() + (task.duration * 60000));
        
        if(task.slack_used > 0 && task.progress < 1 && this.proyectStatus !== "Retrasado" ){
          this.proyectStatus = "Riesgo de Retraso";
        }
        if(task.slack < task.slack_used || endDate < currentDate){
            this.proyectStatus = "Retrasado";
          }
      }
    }

  }

  /**
   * Función que comprueba si las credenciales de un usuario son válidas
   * 
   * @param uname nombre del usuario (único)
   * @param pass contraseña del usuario 
   * @param admin rol del usuario
   * 
   * @return {result: boolean, error: string} comprobante de resultado de la validación
   * 
   * 
  */
  
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

  /**
   * Función que permite guardar un nuevo usuario bajo demanda
   * 
   * 
  */

  public async uploadNewUser(){
    let uname: string = this.crearUsuario.get("nombre")?.value;
    let pass: string = this.crearUsuario.get("password")?.value;
    let admin: boolean = this.crearUsuario.get("admin")?.value;
    const errorMessageElement = this.errorMessage.nativeElement as HTMLDivElement;

    let isValid: {result: boolean, error: string} = this.checkValidCredentials(uname, pass, admin);

    if(isValid.result){
      const newUser: User = {uname: uname, pass: pass, admin: admin, disponible: false};
      await this.dbDao.createUser(newUser);
      this.users.push(newUser);
      this.usuariosFront.push(newUser);
      this.crearUsuario.patchValue({
        nombre: '',
        password: ''
      });
      errorMessageElement.className = "validMessage";
      errorMessageElement.innerText = "Usuario creado correctamente.";
    }else{
      errorMessageElement.className = "errorMessage";
      errorMessageElement.innerText = isValid.error;
    }
    
    //console.log(this.users,this.usuariosFront);

  }

  /**
   * Función que permite eliminar a un usuario de la aplicación
   * 
   * @param {User} usuario usuario que se desea eliminar
  */

  public async eliminarUsuario(usuario: User){


    const errorUserErase = this.errorMessage3.nativeElement as HTMLDivElement;
    

    const lastDateOfWork: string | number = (usuario.tareas && usuario.tareas.length !== 0) ? usuario.tareas[0].acaba : 0;
    if(new Date() < new Date(lastDateOfWork)){
      errorUserErase.className = "errorMessage";
      errorUserErase.innerText = `No se puede eliminar al usuario "${usuario.uname}", tiene tareas aún no realizadas.`;
      return;
    }

    let ok = await this.openDialog(`Está a punto de eliminar al usuario "${usuario.uname}".\n Esta acción no se puede deshacer, ¿Está seguro?`);

    if(!ok){
      return;
    }

    errorUserErase.className = "hidden";
    errorUserErase.innerText = "";

    await this.dbDao.deleteUser(usuario);
    let index = this.users.findIndex((userInList: User)=>
      userInList.uname === usuario.uname && userInList.pass == usuario.pass
    );


    this.users.splice(index, 1);
    this.usuariosFront = this.users.map(user => ({ ...user }));

  }
  /**
   * Función que actualiza el estado del marcador de admin en el usuario seleccionado
   * @param event evento que dispara la ejecución
   * @param index indice indicador del usuario que se deberá actualizar
   * 
  */
  public actualizarAdmin(event: Event, index: number){

    const check = event.currentTarget as HTMLInputElement;

    this.usuariosFront[index].admin = check.checked;


  }

  /**
   * Función que actualiza el estado del marcador de disponibilidad en el usuario seleccionado
   * @param event evento que dispara la ejecución
   * @param index indice indicador del usuario que se deberá actualizar
   * 
  */  
  public actualizarDisponible(event: Event, index: number){

    const check = event.currentTarget as HTMLInputElement;

    this.usuariosFront[index].disponible = check.checked;


  }

  /**
   * Función que pide confirmación al usuario para actualizar los usuarios de la aplicación,
   * en caso de tenerla los actualiza.
   * 
  */  

  public async wrapperActualizarUsuarios(){
    const ok = await this.openDialog("Está a punto de guardar cambios en los usuarios, ¿Está seguro?");
    if(!ok) return;
    await this.actualizarUsuarios();
  }
  

    /**
   * Función que actualiza los usuarios de la aplicación.
   * 
  */
  private async actualizarUsuarios(){
  
    //console.log(this.usuariosFront, this.users);

    const ammountToCompare = this.users.length;

    for(let i: number = 0; i < ammountToCompare; i++){
      let index: number = this.users.findIndex((user: User) => user.uname === this.usuariosFront[i].uname && user.pass === this.usuariosFront[i].pass);
      //console.log(this.usuariosFront[i], "index encontrado ",index)
      /**Cada usuario que haya cambiado el el frontend actualizará al usuario en el backend */
      if(index >= 0 && ( this.usuariosFront[i].admin !== this.users[index].admin) || (this.usuariosFront[i].disponible !== this.users[index].disponible) || ((this.usuariosFront[i].tareas?.length ?? 0 )!== (this.users[index].tareas?.length ?? 0))){
        //console.log(`se procederá a actualizar a ${JSON.stringify(this.users[index])} con ${JSON.stringify(this.usuariosFront[i])}`);
        await this.dbDao.updateUsers(this.users[index], this.usuariosFront[i]);
      }
    }

    this.users = this.usuariosFront.map(user => ({
      ...user,
      tareas: user.tareas ? user.tareas.map(t => ({ ...t })) : []
    }));

  }


    /**
   * Función que que cuenta los dias que una fecha o periodo concreto atraviesa un dia de fin de semana
   * 
   * @param {Date} inicio fecha de inicio del periodo que deseamos comprobar
   * @param {Date} fin fecha de finalización que deseamos comprobar
   * 
   * @returns {number} Cantidad de dias de fin de semana atravesados.
   * 
  */

  private contarFinesDeSemana(inicio: Date, fin: Date): number {
    let contador = 0;
    let fecha = new Date(inicio);
    fecha.setHours(0, 0, 0, 0);
    let fechaFin = new Date(fin)
    fechaFin.setHours(0,0,0,0);

    while (fecha <= fechaFin) {
      const dia = fecha.getDay();
      if (dia === 0 || dia === 6){
        contador++;
      } 
      fecha = new Date(fecha.getTime() + 86400000);
    }

    return contador;
  }

  /**
   * Función que comprueba si una fecha concreta cae en un dia festivo del calendario de la aplicación.
   * 
   * @param {Date} fecha fecha que deseamos comprobarn 
   * @param {boolean} oldFlag indica si se debe usar la configuración actual (false) o antigua (true), false por defecto
   * 
   * @returns {boolean} comprobante para verificar que dicho dia es festivo.
   * 
  */

  private isFestivo(fecha: Date, oldFlag: boolean = false): boolean{
    let count = false;
    const festivos = oldFlag ? this.calendarConfigDataOld.festivos : this.calendarConfigData.festivos;

    for(let festivo of festivos){
      
      const diaInicio = new Date(festivo.diaInicio);
      diaInicio.setHours(0,0,0,0);
      const fechaActual = new Date(fecha);
      fechaActual.setHours(0,0,0,0);
  
      if(festivo.diaFin === undefined){
        if(fechaActual.getTime() === diaInicio.getTime()){
          count = true;
          break;
        }
      }else{
        const diaFin = new Date(festivo.diaFin);
        diaFin.setHours(0,0,0,0);
        if( fechaActual.getTime() >= diaInicio.getTime() && fechaActual.getTime() <= diaFin.getTime()){
          count = true;
          break;
        }
      }
    }

    return count;
  }

  /**
   * Función que que cuenta los dias que una fecha o periodo concreto atraviesa un dia festivo del calendario de la aplicación.
   * 
   * @param {Date} inicio fecha de inicio del periodo que deseamos comprobar
   * @param {Date} fin fecha de finalización que deseamos comprobar
   * @param {boolean} oldFlag indica si se debe usar la configuración actual (false) o antigua (true), false por defecto
   * 
   * @returns {number} Cantidad de dias festivos atravesados.
   * 
  */

  private contarFestivos(inicio: Date, fin: Date, oldFlag: boolean = false): number{
    let count = 0;
    let fechaInicio = new Date(inicio);
    fechaInicio.setHours(0,0,0,0);
    let fechaFin = new Date(fin);
    fechaFin.setHours(0,0,0,0);
    while(fechaInicio <= fechaFin){
      const esFestivo = this.isFestivo(fechaInicio, oldFlag);
      if(esFestivo){
        count++
      }
      fechaInicio = new Date(fechaInicio.getTime() + 86400000);
    }

    return count;
  }


  /**
   * Función que en base a una plantilla de proyecto genera sus correspondientes tareas y las ajusta al calendario lectivo (horas de trabajo, fines de semana y festivos)
   * 
   * @param {TareaPlantilla[]} tasks de la plantilla a traducir en proyecto
   * @param {Link[]} links enlaces entre tarea ya traducidos de las tarea de la plantilla
   * @param {Date} proyectStart fecha de inicio propuesta para el proyecto 
   * 
   * @returns {Task[]} un Array de tareas traducidias y ajustadas al calendario
   * 
   * */

  private parseTemplateTasksToGanttTasks(tasks: TareaPlantilla[], links: Link[], proyectStart: Date): Task[] {

    const horaEntrada = this.calendarConfigData.entrada;
    const horaSalida = this.calendarConfigData.salida;
    const [hora1, minuto1] = horaEntrada.split(':').map(Number);
    const [hora2, minuto2] = horaSalida.split(':').map(Number);

    const duracionJornada =  (hora2 - hora1) * 60 + (minuto2 - minuto1);

    //transformamos tareas de plantilla en tareas de proyecto

    const templateTasks = tasks.map((task) => {
      
    
      return {
        id: task.id,
        text: task.text,
        duration: task.duration,
        offtime: 0,
        start_date: format(proyectStart.getTime() + task.start_date * 3600000, "yyyy-MM-dd HH:mm"),
        details: "",
        slack: 0,
        slack_used: 0,
        progress: 0,
        users: []
      };
    });

    let adaptedTasks: Task[] = [];

    let parsedTasks = templateTasks.map((value: Task)=>({
      ...value
    }));

    parsedTasks.sort((a: Task, b: Task) => {
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    //console.log(parsedTasks, links);

    parsedTasks.forEach((task: Task)=>{

      //obtenemos las tareas predecesoras de la actual tarea

      let IncomingLinks = links.filter((link: Link) => link.target === task.id);
      let startDates: Date[] = [];
      if(adaptedTasks.length !== 0){
        IncomingLinks.forEach((linkPredecesor: Link)=>{
          let taskToAdd = adaptedTasks.find((PredecesorTask) => PredecesorTask.id === linkPredecesor.source );
          if(taskToAdd !== undefined){
            const endTime = new Date(taskToAdd.start_date).getTime() + taskToAdd.duration * 60000;
            startDates.push(new Date(endTime));
          }
        });
      }
      
      // si la tarea tiene predecesoras, la fecha de inicio de la actual tarea será la mayor fecha de finalización de sus predecesoras
      // si no tiene predecesoras, su fecha de inicio será la de por defecto
      let taskAdjustedStartDate = task.start_date;

      if (startDates.length !== 0) {
        startDates.sort((a, b) => b.getTime() - a.getTime());
        taskAdjustedStartDate = format(startDates[0], "yyyy-MM-dd HH:mm");
      }
      
      // Ajustamos el inicio de la tarea si cae fuera de jornada laboral o dia lectivo
      //console.log(task.text, IncomingLinks, taskAdjustedStartDate);
      let fechaInicioTarea = new Date(taskAdjustedStartDate);
      const {horaInicioTarea, minutoInicioTarea} = {horaInicioTarea: fechaInicioTarea.getHours(), minutoInicioTarea: fechaInicioTarea.getMinutes()};
      
      if(horaInicioTarea < hora1 || ((horaInicioTarea === hora1 ) && (minutoInicioTarea < minuto1))){
        fechaInicioTarea.setHours(hora1, minuto1);
      }else if(horaInicioTarea > hora2 || ((horaInicioTarea === hora2 ) && (minutoInicioTarea >= minuto2))){
        fechaInicioTarea.setHours(hora1, minuto1);
        fechaInicioTarea = new Date(fechaInicioTarea.getTime() + 86400000);
      }
      while(isSaturday(fechaInicioTarea) || isSunday(fechaInicioTarea) || this.isFestivo(fechaInicioTarea)){
        fechaInicioTarea = new Date(fechaInicioTarea.getTime() + 86400000);
      }

      //task.start_date = format(fechaInicioTarea, "yyyy-MM-dd HH:mm");
      //console.log(fechaInicioTarea);
      
      //calculamos cuantos dias festivos, horas fuera de jornada y dias en fin de semana que atraviesa la tarea desde el inicio

      let fechaFinDirecto = new Date(fechaInicioTarea.getTime() + task.duration * 60000);
      
      let fullJournals = Math.floor((task.duration / duracionJornada));
      //console.log(fullJournals, (task.duration / duracionJornada));
      
      let tiempoNoLectivo = this.contarFinesDeSemana(fechaInicioTarea, fechaFinDirecto) + this.contarFestivos(fechaInicioTarea,fechaFinDirecto);
      //console.log(tiempoFinDeSemana, fullJournals);
      let tiempoFueraDeJornada = tiempoNoLectivo + fullJournals;

      let fechaFinConFinesDeSemana = new Date(fechaInicioTarea.getTime() + task.duration * 60000  + tiempoFueraDeJornada * 86400000 );
      const horaFin = fechaFinConFinesDeSemana.getHours();
      const minutosFin = fechaFinConFinesDeSemana.getMinutes();

      // si el final de la tarea cae en hora no lectiva, se ajusta al dia siguiente

      let horasExtra = 0;
      let minutosExtra = 0;

      if(horaFin > hora2 || (horaFin === hora2 && (minutosFin > minuto2))){
        fechaFinConFinesDeSemana.setHours(hora1, minuto1);
        fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + 86400000);
        ++tiempoFueraDeJornada;
        horasExtra = horaFin - hora2;
        minutosExtra = minutosFin - minuto2;
      }
      let timeToAdd = (horasExtra * 60 + minutosExtra) * 60000 ;
      tiempoFueraDeJornada += ((horasExtra + minutosExtra / 60)/24);
      fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + timeToAdd);
      
      // si tras el ajuste el fin cae en dia no lectivo, avanzamos dias hasta que caiga en dia lectivo

      while(isSaturday(fechaFinConFinesDeSemana) || isSunday(fechaFinConFinesDeSemana) || this.isFestivo(fechaFinConFinesDeSemana)){
        fechaFinConFinesDeSemana = new Date(fechaFinConFinesDeSemana.getTime() + 86400000);
        ++tiempoFueraDeJornada;
      }
      
      //guardamos el ajuste de la tarea

      const duracionTotal = Math.round((fechaFinConFinesDeSemana.getTime() - fechaInicioTarea.getTime()) / 60000);
      const duracionReal = task.duration;
      const tiempoNoProductivo = duracionTotal - duracionReal;


      const adaptedTask: Task = {id: task.id, text: task.text, start_date: format(fechaInicioTarea, "yyyy-MM-dd HH:mm"), duration: duracionTotal, offtime: tiempoNoProductivo, details: "", slack: 0, slack_used: 0,progress: 0 ,users: [] } 

      adaptedTasks.push(adaptedTask);

    });

    //console.log(adaptedTasks);

    return adaptedTasks;
  }

    /**
     * Función que commprueba cual es la ultima tarea que los usuarios de un proyecto tienen asignada en este proyecto
     * 
     * @param {number} pid identificador único de un proyecto
     * 
     * @returns {{usuario: User,indexUltimaTarea: number}[]} Array de usuarios de un proyecto y el indice de su pila en al que está ultima tarea que tiene en dicho proyecto 
     * 
    */

  private getUsuariosConUltimaTareaEnProyecto(pid: number){
    const usuariosConTarea: { usuario: any; indexUltimaTarea: number; }[] = [];
    /*
    Tener en cuenta el formato de la pila de tareas de un usuario, si la pila es en un momento [X,Y,Z], con X la ultima tarea que tiene asignada 
    (es decir, la tarea que ejecutará mas en el futuro, tenindo por ahora indice 0)
    si le asignamos una nueva tarea I al usuario, la pila tendrá la forma [I,X,Y,Z] (ahora I tiene indice 0, y X tiene indice 1);
    */
    this.usuariosFront.forEach((user: User) => {
      const tareas = user.tareas ?? [];
      //console.log(`Estas son las tarreas del usuario ${user.uname}:\n${JSON.stringify(tareas, null, 2)}\n`);
      // Buscamos desde el indice 0 hacia abajo la última tarea del proyecto con pid: pid (es decir, buscamos desde 0, luego en 1, luego en 2...)
      for (let i = 0; i < tareas.length ; i++) {
          if (tareas[i].pid === pid) {
              usuariosConTarea.push({
                  usuario: user,
                  indexUltimaTarea: i
              });
              //console.log(`estamos en el user ${user.uname} su ultima tarea para el proyecto ${pid} es ${user.tareas[i].tarea}\n`);
              break;
          }
      }
    });

    return usuariosConTarea;
  }

}
