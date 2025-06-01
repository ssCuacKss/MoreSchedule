import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation, inject, LOCALE_ID, ɵChangeDetectionSchedulerImpl, AfterViewInit, OnDestroy } from '@angular/core';
import { gantt } from 'dhtmlx-gantt';
import { dbDAO } from '../dbDAO';
import { DataBaseRawData } from '../data-base-raw-data';
import { ActivatedRoute, Router} from '@angular/router';
import { CPMTask } from '../cpmtask';
import { Task } from '../task';
import { Link } from '../link';
import { Proyect } from '../proyect';
import {addHours, format, hoursToMilliseconds} from 'date-fns'
import { Plantilla } from '../plantilla';
import { TareaPlantilla } from '../tarea-plantilla';
import { LinkPlantilla } from '../link-plantilla';
import { CalendarConfig } from '../calendar-config';

export function parseTemplateTasksToGanttTasks(task: TareaPlantilla[], proyectStart: Date): Task[]{
    let templateTasks:  Task[] = [];
    templateTasks = task.map((task)=>{
      return {
        id: task.id,  
        text: task.text, 
        duration: task.duration, 
        start_date: format(addHours(proyectStart, task.start_date).toString(), "yyyy-MM-dd HH:mm") } as Task;

    });
    return templateTasks;
  }

@Component({
  selector: 'app-schedule-chart',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="header">
      <input #proyectName type="text" [value]="nameContent" id="proyectName" placeholder="el campo no puede estar vacío">
      <div>
        <input type="button" [value]="saveButtonName" id="submit" (click)="uploadChanges()">
        <input type="button" value="Volver sin Guardar" id="return" (click)="returnToCalendar()">
        <input type="button" value="Actualizar Camino Critico" id="CPM" (click)="calculateCriticalPath()">
      </div>
    </div>
    <div #ganttContainer class="scheduleWindow"></div>
    
    `,
  styleUrls: ['./schedule-chart.component.css']
})


export class ScheduleChartComponent implements OnInit, AfterViewInit, OnDestroy {


  tasksService: dbDAO = inject(dbDAO);
  tasksList: DataBaseRawData[] = [];
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private id = this.route.snapshot.queryParams['id'];  
  private mode: string = this.route.snapshot.queryParams['title'];
  private timerID: number = 0;

  public nameContent: string = "";
  public saveButtonName: string = "";


  @ViewChild('proyectName') proyectNameField!: ElementRef;

  @ViewChild('ganttContainer', { static: true }) ganttContainer!: ElementRef;

  async ngAfterViewInit(): Promise<void> {

      if(this.id !== null){
        if(this.mode === "verProyecto"){
          const element = await this.tasksService.GetProyect(this.id).then((proyect: Proyect | any) =>{
              
            return {id: proyect[0].id, start: proyect[0].start, end: proyect[0].end, title: proyect[0].title, color: proyect[0].color} as Proyect;
          });
          this.nameContent = element.title;
        }
        else if(this.mode === 'EditarPlantilla'){
          const element = await this.tasksService.GetTemplate(this.id).then((plantilla:  Plantilla | any)=>{
            return {id: plantilla[0].id, title: plantilla[0].title, end: plantilla[0].end}
          });
          this.nameContent = element.title;
        }
      }

      this.timerID = window.setInterval(()=>{
        this.calculateCriticalPath();
      }, 350);

  }

  ngOnDestroy(): void {
      window.clearInterval(this.timerID);
  }

  async ngOnInit(): Promise<void>{
    
    if(this.mode === "verProyecto"){
      this.initateGanttForViewProyect();
    }else if(this.mode === "EditarPlantilla"){
      this.initiateGanttForEditTemplate();
    }
    

  }
  
  private async initiateGanttForEditTemplate(){
    
    gantt.i18n.setLocale('es');
    
    gantt.config.work_time = true;

    gantt.config.date_format = '%Y-%m-%d %H:%i';

    gantt.config.start_date = new Date("2025-01-01");
    gantt.config.end_date = gantt.date.add(gantt.config.start_date, 31, 'day');

    gantt.config.scales = [
      { unit: 'day',  step: 1, format: '%d %M' },
      { unit: 'hour', step: 1, format: '%H:%i' },
      
    ];

    let timeConfig = await this.tasksService.GetCalendarConfig().then((config: CalendarConfig)=>{
      return {entrada: config.entrada, salida: config.salida, festivos: config.festivos};
    });

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
      { name: 'Descripción', type: 'textarea', map_to: 'details', height: 50 }
    ];

    gantt.init(this.ganttContainer.nativeElement);

    let links = await this.tasksService.GetTemplateLinks(this.id).then((links: LinkPlantilla[])=>{
      return links;
    });
    let tasks = await this.tasksService.GetTemplateTasks(this.id).then((tasks: TareaPlantilla[])=>{
      return tasks;
    });

    let data = parseTemplateTasksToGanttTasks(tasks,gantt.config.start_date);
    
    //console.log(data, links);

    gantt.parse({data,links});

    this.calculateCriticalPath();

  }

  private cambiarFecha(fecha: string): string{
    let splitFullDate = fecha.split(" ");
    let splitDate = splitFullDate[0].split("-");
    if(splitDate[0].length === 4){
      return fecha;
    }else{
      return `${splitDate[2]}-${splitDate[0]}-${splitDate[1]} ${splitFullDate[1]}`
    }
  }

  private async configWorkTime(){
    let timeConfig = await this.tasksService.GetCalendarConfig().then((config: CalendarConfig)=>{
      return {entrada: config.entrada, salida: config.salida, festivos: config.festivos};
    });
  
    console.log(timeConfig);

  }


  private async initateGanttForViewProyect(){    
    let element!: any;


      element = await this.tasksService.GetProyect(this.id).then((proyect: Proyect | any) =>{
        
        return {id: proyect[0].id, start: proyect[0].start, end: proyect[0].end, title: proyect[0].title, color: proyect[0].color} as Proyect;
      });


    let fecha = this.cambiarFecha(element.start);

    gantt.i18n.setLocale('es');
    
    gantt.config.date_format = '%Y-%m-%d %H:%i';

    gantt.config.start_date = new Date(fecha);


    gantt.config.end_date   = gantt.date.add(gantt.config.start_date, 31, 'day');

    gantt.config.scales = [
      { unit: 'day',  step: 1, format: '%d %M' },
      { unit: 'hour', step: 1, format: '%H:%i' },
      
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
        autofix_end: true
      },
      { name: 'Descripción', type: 'textarea', map_to: 'details', height: 50 }
    ];

    gantt.init(this.ganttContainer.nativeElement);

      this.GetTasksAndLinks(this.id).then(({ TaskList, LinkList }: { TaskList: Task[]; LinkList: Link[] }) => {
       
        let data = TaskList;
        let links = LinkList;
        gantt.parse({data, links});
        this.calculateCriticalPath();
      });


  }

  private async GetTasksAndLinks(id: number): Promise<{TaskList: Task[] , LinkList: Link[]}> {
    
    let Tasks: Task[] = [];
    let Links: Link[] = [];

    Links = await this.tasksService.GetProyectLinks(id);
    
    Tasks = await this.tasksService.GetProyectTasks(id);
    
    return {TaskList: Tasks, LinkList: Links};

  }



  constructor() {

    gantt.eachTask((t: any) => {
      gantt.deleteTask(t.id);
    });

    

    switch(this.mode){
      case 'verProyecto':{
        this.nameContent = "proyectName";
        this.saveButtonName = "Guardar Cambios";
        
        break;
      }
      case 'NuevoProyectoSP':{
        this.nameContent = "Nuevo Proyecto";
        this.saveButtonName = "Guardar Proyecto"
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

  public async uploadChanges(): Promise<void>{
    
    const name = (this.proyectNameField.nativeElement as HTMLInputElement).value;

    if(this.mode === "verProyecto"){
          if(name && this.id){

      const content = gantt.serialize();
        try {

          const element = await this.tasksService.GetProyect(this.id).then((proyect: Proyect | any) =>{
              const {startDate, hours} = this.proyectSpan();
              return {id: proyect[0].id, start: format(startDate.toString(), 'MM-dd-yyyy HH:mm'), end: hours, title: name, color: proyect[0].color} as Proyect;
            })

          await this.tasksService.deleteProyectByPidPromise(element.id);

          await this.tasksService.createProyect(element);

          await this.tasksService.deleteAllByPidPromise(this.id);

          await this.tasksService.SaveProyectTasksandLinks(
            this.id,
            content.data,
            content.links
          );
          
        } catch (err) {
          console.error('Error al subir cambios:', err);
        }
      }
        }
        else if(this.mode === 'EditarPlantilla'){
          if(name && this.id){
            const template = await this.tasksService.GetTemplate(this.id).then((plantilla: Plantilla | any) => {
              const {startDate, hours} = this.proyectSpan();
              return {id: plantilla[0].id, title: name, end: hours};
            });
            const tareas: TareaPlantilla[] = this.parseTemplateTasks(template);
            //console.log(tareas);
            const enlaces: LinkPlantilla[] = this.parseTemplateLinks(template);
            //console.log(enlaces)

            try{

              await this.tasksService.deleteTemplateByTidPromise(template.id);

              await this.tasksService.createTemplate(template);

              await this.tasksService.deleteTemplateAllByPidPromise(template.id);

              await this.tasksService.SaveTemplateTasksandLinks(tareas,enlaces);

            }catch (error){
              console.log("error: no se pudo guardar correctamente");
            }

          }
        }
  }

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

  public parseTemplateTasks(template: Plantilla): TareaPlantilla[]{

    let templateTasks:  TareaPlantilla[] = [];

    gantt.eachTask((task)=>{
      let templateTask: TareaPlantilla;
      templateTask= {
        tid: template.id,
        id: task.id,
        text: task.text,
        duration: task.duration,
        start_date: ((task.start_date as Date).getTime() - gantt.config.start_date!.getTime())/3600000
      }
      templateTasks.push(templateTask);
    })

    return templateTasks;
  }
  


  public returnToCalendar(): void{
    this.router.navigate(['/Calendar']);
  
  }

 public calculateCriticalPath(): void {

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
  if (link.type === '0') {            // FS
    graph[link.source].succs.push(link.target);
    graph[link.target].preds.push(link.source);
  }
});

  // 3) orden topológico (DFS)
  const sorted: number[] = [];
  const seen: Record<number, boolean> = {};
  const dfs = (id: number) => {
    if (seen[id]) return;
    seen[id] = true;
    graph[id].preds.forEach(pid => dfs(pid));
    sorted.push(id);
  };
  Object.keys(graph).map(k => +k).forEach(dfs);

  // 4) pasada forward: ES/EF
  sorted.forEach(id => {
    const node = graph[id];
    node.ES = node.preds.length === 0
      ? node.start
      : Math.max(...node.preds.map(pid => graph[pid].EF!));
    node.EF = node.ES + node.dur;
  });

  // 5) pasada backward: LS/LF y slack
  for (let i = sorted.length - 1; i >= 0; i--) {
    const id = sorted[i];
    const node = graph[id];
    node.LF = node.succs.length === 0
      ? node.EF!
      : Math.min(...node.succs.map(sid => graph[sid].LS!));
    node.LS = node.LF - node.dur;
    node.slack = node.LS - node.ES!;
  }

  // 6) colorear tareas críticas (slack === 0)
  sorted.forEach(id => {
    const task = gantt.getTask(id);
    task.color = (graph[id].slack === 0) ? '#d9534f' : '';
    gantt.updateTask(id);
    gantt
  });

  }

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
