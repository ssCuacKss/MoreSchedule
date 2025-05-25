import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation, inject, LOCALE_ID, ɵChangeDetectionSchedulerImpl, AfterViewInit } from '@angular/core';
import { gantt, } from 'dhtmlx-gantt';
import { dbDAO } from '../dbDAO';
import { DataBaseRawData } from '../data-base-raw-data';
import { ActivatedRoute, Router} from '@angular/router';
import { CPMTask } from '../cpmtask';
import { Task } from '../task';
import { Link } from '../link';
import { Title } from '@angular/platform-browser';
import { query } from 'express';
import { Proyect } from '../proyect';


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
export class ScheduleChartComponent implements OnInit, AfterViewInit {




  tasksService: dbDAO = inject(dbDAO);
  tasksList: DataBaseRawData[] = [];
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private id = null;  
  private mode: string = this.route.snapshot.queryParams['title'];
  public nameContent: string = "";
  public saveButtonName: string = "";

  @ViewChild('proyectName') proyectNameField!: ElementRef;

  @ViewChild('ganttContainer', { static: true }) ganttContainer!: ElementRef;

  async ngAfterViewInit(): Promise<void> {

      if(this.id !== null){
        const element = await this.tasksService.GetProyect(this.id).then((proyect: Proyect | any) =>{
              
            return {id: proyect[0].id, start: proyect[0].start, end: proyect[0].end, title: proyect[0].title, color: proyect[0].color} as Proyect;
          });
        this.nameContent = element.title;
      }

  }

  ngOnInit(): void {
    


    this.id = this.route.snapshot.queryParams['id'] ?? null;

    gantt.i18n.setLocale('es');
    
    gantt.config.date_format = '%Y-%m-%d %H:%i';

    gantt.config.start_date = new Date(2025, 0, 1);
    gantt.config.end_date = gantt.date.add(gantt.config.start_date, 15, 'day');

    gantt.config.scales = [
      { unit: 'day',  step: 1, format: '%d %M' },
      { unit: 'hour', step: 1, format: '%H:%i' },
      
    ];

    gantt.config['subscales'] = [
      { unit: 'minute', step: 15, format: '%H:%i'}
    ]


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
        year_range: [2020, 2030],
        height: 72,
        autofix_end: true
      },
      { name: 'Descripción', type: 'textarea', map_to: 'details', height: 50 }
    ];

    gantt.init(this.ganttContainer.nativeElement);

    if(this.id){
      this.GetTasksAndLinks(this.id).then(({ TaskList, LinkList }: { TaskList: Task[]; LinkList: Link[] }) => {
       
        let data = TaskList;
        let links = LinkList;
        gantt.parse({data, links});
        this.calculateCriticalPath();
      });
    }

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
        if(this.route.snapshot.queryParams["name"]){
          this.nameContent = this.route.snapshot.queryParams['name'];
        }
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

    console.log(name);

    if(name && this.id){

      const content = gantt.serialize();
        try {

          const element = await this.tasksService.GetProyect(this.id).then((proyect: Proyect | any) =>{
              
              return {id: proyect[0].id, start: proyect[0].start, end: proyect[0].end, title: name, color: proyect[0].color} as Proyect;
            })

          await this.tasksService.deleteProyectByPidPromise(element.id);

          await this.tasksService.createProyect(element);

          await this.tasksService.deleteAllByPidPromise(this.id);

          await this.tasksService.SaveProyectTasksandLinks(
            this.id,
            content.data,
            content.links
          );

          console.log('Cambios subidos correctamente');
        } catch (err) {
          console.error('Error al subir cambios:', err);
        }
      }
  }

  public returnToCalendar(): void{
    this.router.navigate(['/Calendar']);
  }

  private processRawDataMontaje(){

    let size: number = this.tasksList.length;
    for(let i = 0 ; i < size - 1; i++){
      if(this.tasksList[i].ID.includes(this.tasksList[i+1].ID)){
        this.tasksList.splice(i+1,1);
        --size;
      }
    }

    console.log(this.tasksList);

    const filteredDataLvlmax: DataBaseRawData[] = this.tasksList.filter(
      element => (element.Nv === 1 || element.Nv === 2) && element.Tipo == "T"
    );
    let filteredDataLvlmaxCopy = [...filteredDataLvlmax].reverse();
    let lastLevel: number = filteredDataLvlmax[filteredDataLvlmax.length-1].Nv;


    let StartingLevel: boolean = true;
    filteredDataLvlmax.forEach(element => {
      
    });

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

}
