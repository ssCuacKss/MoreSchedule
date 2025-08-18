import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation, inject, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { gantt } from 'dhtmlx-gantt';
import { dbDAO } from '../dbDAO';
import { ActivatedRoute, Router} from '@angular/router';
import { CPMTask } from '../cpmtask';
import { Task } from '../DTO/task';
import { Link } from '../DTO/link';
import { Proyect } from '../DTO/proyect';
import { CalendarConfig } from '../DTO/calendar-config';
import { format } from 'date-fns';
import { Plantilla } from '../DTO/plantilla';
import { TareaPlantilla } from '../DTO/tarea-plantilla';
import { LinkPlantilla } from '../DTO/link-plantilla';
import { __values } from 'tslib';
import { CookieService } from 'ngx-cookie-service';



@Component({
  selector: 'app-schedule-chart',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="dialogDisabled" #dialog>
      <div class="dialogHeader">    
      <h1 style="margin-left: 20px;">Advertencia</h1>
      <button class="closeButton" (click)="cancelAction()">Cancelar</button>
      </div>
      <h4 style="margin-left: 25px; margin-right:25px">{{confirmDLG}}</h4>
      <div id="optionsDialog">
        <input type="button" value="Aceptar" id="closeDialogButton" style="margin: 20px;" (click)="performAction()">
      </div>
    </div>

    <div class="header">
      <input #proyectName type="text" [value]="nameContent" id="proyectName" placeholder="el campo no puede estar vacío">
      <div>
        <input type="button" [value]="saveButtonName" id="submit" (click)="uploadChanges(false)">
        <input type="button" value="Volver sin Guardar" id="return" (click)="returnToCalendar()">
      </div>
    </div>
    <div #ganttContainer class="scheduleWindow"></div>
    
    `,
  styleUrls: ['./schedule-chart.component.css']
})

/**
 * Clase encargada de inicializar y configurar la tabla gantt, ademas de la configuración y edición de proyectos y plantillas; 
 * 
 * 
 * 
*/

export class ScheduleChartComponent implements OnInit, AfterViewInit, OnDestroy {

  public confirmDLG: string = "";
  private dbDao: dbDAO = inject(dbDAO);
  private data: Task[] = [];
  private cpmTasks: CPMTask[] = [];
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private cookie: CookieService = inject(CookieService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private saveFlag: boolean = true;
  private id = this.route.snapshot.queryParams['id'];  
  private mode: string = this.route.snapshot.queryParams['title'];
  private tarea: string = this.route.snapshot.queryParams['tarea'];
  private timerID: number = 0;

  public nameContent: string = "";
  public saveButtonName: string = "";


  @ViewChild('proyectName') proyectNameField!: ElementRef;
  @ViewChild('ganttContainer', { static: true }) ganttContainer!: ElementRef;
  @ViewChild('dialog') dialog!: ElementRef;
  
  /**
   * Función encargada de inicializar aspectos base de la tabla gantt una vez ya se ha generado su vista, como las tareas de los proyectos y plantillas, el refrescado de las tareas... etc;
   * 
   * 
   * 
  */

  async ngAfterViewInit(): Promise<void> {

      if(this.id !== null){
        if(this.mode === "verProyecto"){
          // obtenemos los datos del proyecto
          const element = await this.dbDao.GetProyect(this.id).then((proyect: Proyect | any) =>{
            return {id: proyect[0].id, start: proyect[0].start, end: proyect[0].end, title: proyect[0].title, color: proyect[0].color} as Proyect;
          });
          this.nameContent = element.title;
          // iniciamos el temporizador que refresca las tareas 10 minutos
          this.timerID = window.setInterval(async()=>{
            gantt.clearAll();
                await this.GetTasksAndLinks(this.id).then(({ TaskList, LinkList }: { TaskList: Task[]; LinkList: Link[] }) => {
                this.data = TaskList;
                let data = TaskList;
                let links = LinkList;
                this.saveFlag = this.checkDataforCPM(data);
                gantt.parse({data, links});
                this.calculateCriticalPath(gantt.config.start_date as Date);
              
            });
          },  10 * 60000);   
        }
        else if(this.mode === 'EditarPlantilla'){
          // obtenemos los datos de la plantilla
          const element = await this.dbDao.GetTemplate(this.id).then((plantilla:  Plantilla | any)=>{
            return {id: plantilla[0].id, title: plantilla[0].title, end: plantilla[0].end}
          });
          this.nameContent = element.title;
          //iniciamos el temporizador para calcular el camino crítico del proyecto.
          this.timerID = window.setInterval(()=>{
          this.calculateCriticalPath(gantt.config.start_date as Date);
        }, 350);   
        }
          
      }
  }
  /**
   * Función encargada de parar las acciones periódicas de la vista;
   * 
   * 
  */
  ngOnDestroy(): void {
      window.clearInterval(this.timerID);
  }

  /** Funciones encargadas de abrir la ventana de dialogo para confirmar o cancelar acciones*/

  private dialogResolver?: (v: boolean) => void;

  public async openDialog(msg: string): Promise<boolean> {
    this.confirmDLG = msg;
    (this.dialog.nativeElement as HTMLElement).className = 'dialogPanel';
    return new Promise<boolean>(resolve => (this.dialogResolver = resolve));
  }

  public cancelAction() {
    (this.dialog.nativeElement as HTMLElement).className = 'dialogDisabled';
    this.dialogResolver?.(false);
    this.dialogResolver = undefined;
  }

  public performAction() {
    (this.dialog.nativeElement as HTMLElement).className = 'dialogDisabled';
    this.dialogResolver?.(true);
    this.dialogResolver = undefined;
  }

  /**
   * Funcion encargada de iniciar la vista de la tabla gantt en función del modo de visualización. puede inicializar para:
   *  1. Visualización y edición de proyectos. 
   *  2. Visualización y edición de plantillas.
   * 
   * 
  */

  async ngOnInit(): Promise<void>{
    
    if(this.mode === "verProyecto"){
      this.initateGanttForViewProyect();
    }else if(this.mode === "EditarPlantilla"){
      this.initiateGanttForEditTemplate();
    }
  } 

  /**
   * Inicializa la tabla gantt, el cajón de configuración de tareas y el parseado de tareas para el modo de edición de plantillas
   * 
   * 
  */

  private async initiateGanttForEditTemplate(){
    // configura la tarea de gantt para añadirle un nuevo campo user_count
    gantt.attachEvent('onTaskCreated',(task: any) => {
      task.user_count = 1;
      return true;
    });


    // configuración básica de DHTMLEGantt
    gantt.i18n.setLocale('es');

    gantt.config.date_format = '%Y-%m-%d %H:%i';

    gantt.config.start_date = new Date("2025-01-01");
    gantt.config.end_date = gantt.date.add(gantt.config.start_date, 31, 'day');

    gantt.config.drag_resize = true;
    gantt.config.drag_move = true;
    gantt.config.drag_links = true;
    gantt.config.inherit_scale_class = false;

    gantt.templates.scale_cell_class = (() =>{});

    gantt.config.scales = [
    {
      unit: "day",
      step: 1,
      format: date => {
        return "Día " + (Math.ceil((gantt.columnIndexByDate(date))/24) + 1);
      }
    },
    { unit: "hour", step: 1, format: "%H:%i" }
  ];

    gantt.config.scale_height = 50;
    gantt.config.min_column_width = 45;
    gantt.config.duration_unit = 'minute';
    gantt.config.duration_step = 1;
    gantt.config.time_step = 5;
    gantt.config.round_dnd_dates = false;
    gantt.config.min_duration    = 1 * 60 * 1000;
    
    gantt.config.columns= [
      {name: "text", label: "Titulo", align: "center"},
      {name: "add", label: ''}
    ];

    gantt.config.lightbox.sections = [
      { name: 'Nombre', type: 'textarea', map_to: 'text', height: 35, focus: true },
      {
        name: 'Periodo',
        type: 'duration',
        map_to: 'auto',
        time_format: ['%d', '%m', '%Y', '%H:%i'],
        year_range: [gantt.config.start_date.getFullYear()-1, gantt.config.start_date.getFullYear()+2],
        height: 72,
        autofix_end: true,
        
      },
      {
        name: 'Operarios necesarios',
        type: 'select',
        map_to: 'user_count',
        options: [
          { key: 1, label: '1' },
          { key: 2, label: '2' },
          { key: 3, label: '3' }
        ],
        default_value: 1
      }
  
    ];

    gantt.init(this.ganttContainer.nativeElement);

    // obtención de datos de proyecto (enlaces y tareas)

    let links = await this.dbDao.GetTemplateLinks(this.id).then((links: LinkPlantilla[])=>{
      return links;
    });
    let tasks = await this.dbDao.GetTemplateTasks(this.id).then((tasks: TareaPlantilla[])=>{
      return tasks;
    });

    let data = this.parseTemplateTasksToGanttTasks(tasks,gantt.config.start_date);
    
    //console.log(data, links);

    gantt.parse({data,links});

    this.calculateCriticalPath(gantt.config.start_date as Date);
  
  }

  /** Función que comprueba el formato de la fecha de inicio de una tarea, cambiandole el formato al deseado si corresponde
   * 
   * @param {string} fecha cadena de caracteres que representa a una fecha 
   * @returns {string} fecha en el formato necesario para la librería DHTMLEGantt
  */

  private cambiarFecha(fecha: string): string{
    let splitFullDate = fecha.split(" ");
    let splitDate = splitFullDate[0].split("-");
    if(splitDate[0].length === 4){
      return fecha;
    }else{
      return `${splitDate[2]}-${splitDate[0]}-${splitDate[1]} ${splitFullDate[1]}`
    }
  }

  /**
  * parsea las tareas de una plantilla a tareas compatibles con DHTMLEGantt.
  * 
  * @param {TareaPlantilla[]} tasks Array de tareas de la plantilla
  * @param {Date} proyectStart fecha de inicio de la plantilla actual actual
  * 
  * @returns {any[]} lista de tareas compatibles con el motor DHTMLEGantt
  * 
  */

  private  parseTemplateTasksToGanttTasks(tasks: TareaPlantilla[], proyectStart: Date): any[]{
    let templateTasks:  Task[] = [];


    templateTasks = tasks.map((task)=>{

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
        users: [],
        user_count: task.user_count };
    });
    return templateTasks;
  }

  /**
   * Función que comprueba si una fecha concreta cae en un dia festivo de un calendario personalizado.
   * 
   * @param {Date} fecha fecha que deseamos comprobar
   * @param {CalendarConfig} festivos calendario que contiene el listado de festivos de la aplicación 
   * 
   * @returns {boolean} comprobante para verificar que dicho dia es festivo.
   * 
  */

  public isFestivo(fecha: Date, festivos: CalendarConfig): boolean{

    let count = false;
    for(let festivo of festivos.festivos){
      
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
  * Inicializa la tabla gantt, el cajón de configuración de tareas y el tipo de guardado requerido;
  * 
  * 
  */

  private async initateGanttForViewProyect(){    

    // configuración básica de DHTMLEGantt

    // configuración de lightBox y bloqueo de creación de nuevas tareas y edición de enlaces.

    const horario = await this.dbDao.GetCalendarConfig();

    gantt.attachEvent('onLinkDblClick', () => false);

    gantt.attachEvent('onLightbox', taskId => { 
      const task = gantt.getTask(taskId);
      const userCount = task["users"].length;
      //console.log(userCount);
      const section = gantt.getLightboxSection(`Operario 1`);
      const foundLabels = Array.from(section.node.parentElement?.querySelectorAll("label") || []) as HTMLLabelElement[];
      const operarioLabels = foundLabels.filter((value: HTMLLabelElement)=>{
        if(value.innerText.includes('Operario')){
          return value;
        }else{
          return null
        }
      });
      
    
  
      //console.log(operarioLabels);
      let taskCounter = 0;
      for (let i = 0; i < operarioLabels.length; i++) {  
        
        if (taskCounter < userCount) {
          operarioLabels[i].innerText = `Operario ${i + 1}: ${task["users"][i].uname}`;
          operarioLabels[i].style.display = "";
        } else {
          operarioLabels[i].innerText = `Operario ${i + 1}:`;
          operarioLabels[i].style.display = "none";
        }
        taskCounter++;

      }
      return true;
    });
    
    let element!: any;


    element = await this.dbDao.GetProyect(this.id).then((proyect: Proyect | any) =>{
        
      return {id: proyect[0].id, start: proyect[0].start, end: proyect[0].end, title: proyect[0].title, color: proyect[0].color} as Proyect;
    });



    

    let fecha = this.cambiarFecha(element.start);

    gantt.i18n.setLocale('es');
    
    gantt.config.date_format = '%Y-%m-%d %H:%i';

    gantt.config.start_date = new Date(fecha);

    gantt.config.drag_resize = false;
    gantt.config.drag_move = false;
    gantt.config.drag_links = false;
    gantt.config.end_date   = gantt.date.add(gantt.config.start_date, 31, 'day');

    gantt.config.scales = [
      { unit: 'day',  step: 1, format: '%l, %d %M' },
      { unit: 'hour', step: 1, format: '%H:%i' },
      
    ];
    // cambiar color de la barra de la escala horaria a rojo si no es un dia lectivo.
    gantt.config.inherit_scale_class = true;

    gantt.templates.scale_cell_class = (date) => {
      if (date.getDay() === 0 || date.getDay() === 6 || this.isFestivo(date,horario)) {
        return "highlight-day";
      }else{
        return "";
      }
    };



    gantt.config.scale_height = 50;
    gantt.config.min_column_width = 45;

    gantt.config.duration_unit = 'minute';
    gantt.config.duration_step = 1;
    gantt.config.time_step = 5;
    gantt.config.round_dnd_dates = false;
    gantt.config.min_duration = 1 * 60 * 1000;

    gantt.config.columns= [
      {name: "text", label: "Titulo", align: "left", width: 150},
      {name: "slack", label: "holgura (mins)", align: "center", width: 120},
    ];


    gantt.config.lightbox.sections = [
      { name: 'Nombre', type: 'textarea', map_to: 'text', height: 35, focus: true},
      {
        name: 'Periodo',
        type: 'duration',
        map_to: 'auto',
        time_format: ['%d', '%m', '%Y', '%H:%i'],
        year_range: [gantt.config.start_date.getFullYear() - 1, gantt.config.start_date.getFullYear()+2],
        height: 72,
        autofix_end: true,
        readonly: true
      },
      { name: 'Observaciones', type: 'textarea', map_to: 'details', height: 100 },
      { name: 'Operario 1', type: 'template', map_to: 'usuario_1' },
      { name: 'Operario 2', type: 'template', map_to: 'usuario_2' },
      { name: 'Operario 3', type: 'template', map_to: 'usuario_3' }
    ];

    gantt.init(this.ganttContainer.nativeElement);

    await this.GetTasksAndLinks(this.id).then(({ TaskList, LinkList }: { TaskList: Task[]; LinkList: Link[] }) => {
      
      this.data = TaskList;
      let data = TaskList;
      let links = LinkList;
      this.saveFlag = this.checkDataforCPM(data);
      gantt.parse({data, links});
      this.calculateCriticalPath(gantt.config.start_date as Date);
    });
    
    await this.uploadChanges(true);
    
    if(this.tarea){
      gantt.showLightbox(this.tarea);
    }
    

  }

  /** Comprueba si un proyecto necesita ser guardado o actualizado en función de su holgura.
   * 
   * @param {Task[]} tasks tareas del proyecto a comprobar si requieren guardado.
   * 
   * @returns {boolean} comprobante para determinar si el proyecto necesita guardado o actualización.
   *  
  */

  private checkDataforCPM(tasks: Task[]): boolean{
    let needSave = true;
    for(let task of tasks){
      if(task.slack > 0){
        needSave = false;
        break;
      }
    }
    return needSave;
  }

  /**
   * Función que obtiene el conjunto de tareas y enlaces para un proyecto gantt.
   * 
   * @param {number} id identificador único del proyecto que contiene las tareas.
   * 
   * @return Conjunto de tareas y enlaces del proyecto especificado.
   * 
   * 
  */

  private async GetTasksAndLinks(id: number): Promise<{TaskList: Task[] , LinkList: Link[]}> {
    
    let Tasks: Task[] = [];
    let Links: Link[] = [];

    Links = await this.dbDao.GetProyectLinks(id);
    
    Tasks = await this.dbDao.GetProyectTasks(id);
    
    return {TaskList: Tasks, LinkList: Links};

  }


  /**
   * Constructor que inicializa elementos básicos de la interfaz de usuario como los botones.
   * 
   * 
  */

  constructor() {

   if(this.cookie.get('LoginCookie').valueOf() !== 'ALLOWEDTOLOGIN'){
      this.router.navigate(['/']);
    }

    gantt.eachTask((t: any) => {
      gantt.deleteTask(t.id);
    });

    

    switch(this.mode){
      case 'verProyecto':{
        this.nameContent = "proyectName";
        this.saveButtonName = "Guardar Cambios";
        
        break;
      }
      case 'NuevaPlantilla':{
        this.nameContent = "Nueva Plantilla";
        this.saveButtonName = "Guardar Plantilla"
        break;
      }
      case 'EditarPlantilla':{
        this.saveButtonName = "Guardar Plantilla"
        break;
      }
      default:{
        this.nameContent = "noAccess";
        break;
      }

    }
    //console.log(this.route.snapshot.queryParams['title']);
  }

  /** Función que comprueba las diferencias entre el proyecto y su versión en la base de datos
   * 
   * 
   * @returns {Promise<boolean>} comprobante de diferencias entre proyectos.
  */

  private async checkDataDifferences(): Promise<boolean>{
    const {TaskList, LinkList} = await this.GetTasksAndLinks(this.id);
    let tasks: Task[] = [];
    gantt.eachTask(t => {
      tasks.push(t as Task);
    })
    if(tasks.length !== TaskList.length){
      return true;
    }
    for(let i = 0; i < tasks.length; i++){
      if(tasks[i].details !== TaskList[i].details || tasks[i].text !== TaskList[i].text || tasks[i].progress !== TaskList[i].progress){
        return true;
      }
    }
    return false;
  }

  /** Función que comprueba las diferencias entre una plantilla y su versión en la base de datos
   * 
   * 
   * @returns {Promise<boolean>} comprobante de diferencias entre plantillas.
  */

  private async checkDataDifferencesTemplate(): Promise<boolean> {
    const TaskList: TareaPlantilla[] = await this.dbDao.GetTemplateTasks(this.id);
    const LinkList: LinkPlantilla[] = await this.dbDao.GetTemplateLinks(this.id);

    let tasks: TareaPlantilla[] = [];
    gantt.eachTask(t => {
      tasks.push(t);
    });

    if (tasks.length !== TaskList.length) {
      return true;
    }

    const baseMs = (gantt.config.start_date as Date).getTime();

    for (let i = 0; i < tasks.length; i++) {
      const cur = tasks[i];
      const db  = TaskList[i];

      const curOffsetHours = (new Date(cur.start_date as any).getTime() - baseMs) / 3600000;

      if (
        cur.text !== db.text ||
        cur.duration !== db.duration ||
        Number(cur.user_count) !== db.user_count ||
        curOffsetHours !== db.start_date
      ) {
        return true;
      }
    }

    let links: LinkPlantilla[] = gantt.getLinks() as LinkPlantilla[];

    if (links.length !== LinkList.length) {
      return true;
    }

    for (let i = 0; i < links.length; i++) {
      if (
        links[i].source !== LinkList[i].source ||
        links[i].target !== LinkList[i].target
      ) {
        return true;
      }
    }

    return false;
  }

  /** Función que guarda la información del proyecto o la tarea en la base de datos
   * 
   * @param {boolean} doneByInit controla si la función ha sido llamada por el usuario o por la aplicación, {false} por defecto
   * 
  */

  public async uploadChanges(doneByInit: boolean = false): Promise<void>{
    
    const hasChanges = (this.mode === "verProyecto") ? await this.checkDataDifferences() : await this.checkDataDifferencesTemplate();

    if(!doneByInit && hasChanges){
      const ok = await this.openDialog("¿Estás seguro de que deseas guardar los cambios?");

      if(!ok){
        return;
      }
    }

    const name = (this.proyectNameField.nativeElement as HTMLInputElement).value;

    if(this.mode === "verProyecto"){
      
      if(name && this.id){

        const content = gantt.serialize();
        try {

          const element = await this.dbDao.GetProyect(this.id).then((proyect: Proyect | any) =>{
              const {startDate, hours} = this.proyectSpan();
              return {id: proyect[0].id, start: format(startDate.toString(), 'MM-dd-yyyy HH:mm'), end: hours, title: name, color: proyect[0].color} as Proyect;
          })

          await this.dbDao.deleteProyectByPidPromise(element.id);

          await this.dbDao.createProyect(element);
          
          if(this.saveFlag){
            await this.dbDao.deleteAllByPidPromise(this.id);
            await this.dbDao.SaveProyectTasksandLinks(
              this.id,
              content.data,
              content.links
            );
            this.saveFlag = false;
            //console.log("guardar");
          }else if(!this.saveFlag){
            await this.dbDao.updateProyectTasks(
              this.id,
              content.data,
              content.links
            );
            //console.log("actualizar");
          }
   
          
          //console.log("tareas que se envían al DAO",this.id, content.data, content.links);

          /*content.data.forEach((values: any) => {
            console.log(values['slack']);
          });*/ 
          
        } catch (err) {
          console.error('Error al subir cambios:', err);
        }
      }
    }
    else if(this.mode === 'EditarPlantilla'){
      if(name && this.id){
        const template = await this.dbDao.GetTemplate(this.id).then((plantilla: Plantilla | any) => {
          const {startDate, hours} = this.proyectSpan();
          return {id: plantilla[0].id, title: name, end: hours};
        });
        const tareas: TareaPlantilla[] = this.parseToTemplateTasks(template);
        //console.log(tareas);
        const enlaces: LinkPlantilla[] = this.parseTemplateLinks(template);
        //console.log(enlaces)

        try{

          await this.dbDao.deleteTemplateByTidPromise(template.id);

          await this.dbDao.createTemplate(template);

          await this.dbDao.deleteTemplateAllByPidPromise(template.id);

          await this.dbDao.SaveTemplateTasksandLinks(tareas,enlaces);

          /*
          await this.dbDao.deleteTemplateAllByPidPromise(template.id);
          await this.dbDao.deleteTemplateAllByPidPromise(template.id);
          */

        }catch (error){
          console.log("error: no se pudo guardar correctamente");
        }

      }
    }
  }

  /** Función que traduce los enlaces de una plantilla de DHTMLEGantt a enlaces interpretables por la aplicación
   * 
   * @param {Plantilla} template Objeto plantilla a la que pertenencen los enlaces;
   * 
   * @returns {LinkPlantilla[]} Conjunto de enlaces entre tareas interpretables por DHTMLEGantt
   * 
  */

  public parseTemplateLinks(template: Plantilla): LinkPlantilla[]{

    const links = gantt.getLinks();

    let templateLinks = links.map(l =>{
      return {
        tid: template.id,
        id: l.id,
        source: l.source,
        target: l.target,
        type: l.type

      } as LinkPlantilla;
    });

    return templateLinks;
  }

  /** Función que traduce las tareas de una plantilla de DHTMLEGantt a enlaces interpretables por la aplicación
   * 
   * @param {Plantilla} template Objeto plantilla a la que pertenencen los enlaces
   * 
   * @returns {LinkPlantilla[]} Conjunto de Tareas interpretables por la app
   * 
  */

  public parseToTemplateTasks(template: Plantilla): TareaPlantilla[]{

    let templateTasks:  TareaPlantilla[] = [];

    gantt.eachTask((task)=>{
      //console.log(task.user_count);
      let templateTask: TareaPlantilla;
      templateTask= {
        tid: template.id,
        id: task.id,
        text: task.text,
        duration: task.duration,
        start_date: ((task.start_date as Date).getTime() - gantt.config.start_date!.getTime())/3600000,
        user_count: parseInt(task.user_count)
      }
      templateTasks.push(templateTask);
    })

    return templateTasks;
  }
  
  /** Función que vuelve al calendario de la aplicación, avisa al usuario si existe la posibilidad de descartar cambios.
   * Borra automáticamente una plantilla si está vacia.
   * 
  */

  public async returnToCalendar(): Promise<void>{
    
    const hasChanges = (this.mode === "verProyecto") ? await this.checkDataDifferences() : await this.checkDataDifferencesTemplate();
    let ok = false;

    if(hasChanges){
      const ok = await this.openDialog("Todos los cambios no guardados serán descartados, ¿deseas continuar?");
      if(!ok){
        return;
      }
    }
      
    const tasks: TareaPlantilla[] = await this.dbDao.GetTemplateTasks(this.id).then((t: TareaPlantilla[])=> {return t});
    if(tasks.length === 0){
      await this.dbDao.deleteTemplateByTidPromise(this.id);
    }

    this.router.navigate(['/Calendar']);
  
  }

  /** Función que Calcula el camino crítico de las tareas de la tabla gantt en función de una fecha de inicio 
   * 
   * @param {Date} baseStartDate Fecha de inicio de la tabla gantt
   * 
  */

  public calculateCriticalPath(baseStartDate: Date): void {

    //console.log(baseStartDate);
    const unitMs = 60 * 1000;

    const graph: Record<number, CPMTask> = {};
    gantt.eachTask((t: any) => {
      graph[t.id] = {
        id:    t.id,
        start: t.start_date.getTime(),
        dur:   t.duration,
        preds: [],
        succs: []
      };
    });

    gantt.getLinks().forEach((link: any) => {
      if (link.type === '0') { // FS
        graph[link.source].succs.push(link.target);
        graph[link.target].preds.push(link.source);
      }
    });

    //orden topológico, obtenermos el orden de las tareas
    const sorted: number[] = [];
    const seen: Record<number, boolean> = {};
    const dfs = (id: number) => {
      if (seen[id]) return;
      seen[id] = true;
      graph[id].preds.forEach(pid => dfs(pid));
      sorted.push(id);
    };
    Object.keys(graph).map(k => +k).forEach(dfs);

    // pasada forward: calculamos el earliest start de las tareas y el earliest finish
    // si una tarea no tiene predecesores se le añade un offset entre el inicio de proyecto y tarea.
    sorted.forEach(id => {
      const node = graph[id];
      node.ES = node.preds.length === 0
        ? (node.start - baseStartDate.getTime()) / unitMs 
        : Math.max(...node.preds.map(pid => graph[pid].EF!));
      node.EF = node.ES + node.dur;
    });

    // pasada backward: calculamos el latest finish y latest start
    for (let i = sorted.length - 1; i >= 0; i--) {
      const id = sorted[i];
      const node = graph[id];
      node.LF = node.succs.length === 0
        ? node.EF!
        : Math.min(...node.succs.map(sid => graph[sid].LS!));
      node.LS = node.LF - node.dur;
      node.slack = node.LS - node.ES!;
    }

    this.cpmTasks = sorted.map(id => graph[id]);

    //coloreamos tareas críticas (slack === 0)
    sorted.forEach(id => {
      const task = gantt.getTask(id);
      task.color = (graph[id].slack === 0) ? '#d9534f' : '';
      task['slack'] = graph[id].slack;
      gantt.updateTask(id);
    });
  }

  /** Función que Calcula la duración de un proyecto o plantilla
   * 
   * @param {Date} startDate Fecha de inicio del proyecto, coincide con la fecha de inicio de la tabla gantt.
   * @param {number} hours horas que dura el proyecto o plantilla
   * 
   * @returns {} hora de inicio mas temprana posible del proyecto y duración total del proyecto en horas
   * 
  */

  private proyectSpan():{startDate: Date, hours: number}{
    
    let earliestStart: Date = new Date(0); 
    let latestEnd: Date = new Date(0);
    let started: boolean = false;
   
    gantt.eachTask((t)=>{
      if(!started){
        earliestStart = t.start_date;
        latestEnd = t.end_date;
        started = true;
      }else{
        if(earliestStart > t.start_date){
          earliestStart = t.start_date
        }
        if(latestEnd < t.end_date){
          latestEnd = t.end_date;
        }
      }
    });

    //console.log(Math.ceil((latestEnd.getTime() - earliestStart.getTime())/3600000));

    return { startDate: earliestStart, hours: Math.ceil((latestEnd.getTime() - earliestStart.getTime())/3600000) };
  }
}