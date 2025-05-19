import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation, inject, LOCALE_ID } from '@angular/core';
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { ProyectTasksService } from '../proyect-tasks.service';
import { DataBaseRawData } from '../data-base-raw-data';
import {} from '@angular/common/locales/es'


@Component({
  selector: 'app-schedule-chart',
  encapsulation: ViewEncapsulation.None,
  template: `<div #ganttContainer class="scheduleWindow"></div>`,
  styleUrls: ['./schedule-chart.component.css']
})
export class ScheduleChartComponent implements OnInit {
  tasksService: ProyectTasksService = inject(ProyectTasksService);
  tasksList: DataBaseRawData[] = [];

  @ViewChild('ganttContainer', { static: true })
  ganttContainer!: ElementRef;

  ngOnInit(): void {
    
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
        type: 'time',
        map_to: 'auto',
        time_format: ['%d', '%m', '%Y', '%H:%i'],
        year_range: [2020, 2030],
        height: 72,
        autofix_end: true
      },
      { name: 'Descripción', type: 'textarea', map_to: 'details', height: 50 }
    ];

    gantt.init(this.ganttContainer.nativeElement);

    const items = {data: [
        { id: 1, text: 'Tarea principal', start_date: '2025-01-01 18:00', end_date: '2025-01-01 19:00', type:"baseline"},
        { id: 2, text: 'Subtarea', start_date: '2025-01-01 20:20', end_date: '2025-01-01 21:00' }
      ], links: [
        {id: 1, source: 1, target: 2, type: '0'}
      ]
    };

    gantt.parse(items);
  }
  
  constructor() {
    this.tasksService.GetProyectTasks().then((tasksList: DataBaseRawData[]) => {
      this.tasksList = tasksList;
      this.processRawDataMontaje();

    }); 
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


  /*private processRawData(){
    let size: number = this.tasksList.length;
    for(let i = 0 ; i < size - 1; i++){
      if(this.tasksList[i].ID.includes(this.tasksList[i+1].ID)){
        this.tasksList.splice(i+1,1);
        --size;
      }
    }
    //let prevNv = this.tasksList.filter(element => element.Nv === 6);
    let startHour: Date = new Date(this.start);
    for (let d = 4; d > 0; d--){
      //console.log(d);
      let levelTasks: DataBaseRawData[] = this.tasksList.filter(element => element.Nv === d && element.Tipo === "T");
      //levelTasks.reverse();
      //console.log(levelTasks);
      //let startHour: Date = new Date(this.start);

      for(let i = 0; i < levelTasks?.length; i++){
        let task!: GanttItem;
        console.log(`estoy en la tarea ${levelTasks[i].ID}`)
        if(levelTasks[i].ArtRecurso != "" ){
          let confase = levelTasks[i].ArtRecurso.split('_');
          console.log(confase);
          if(confase.length == 2){
            let precursors = this.tasksList!.find( element => {
              let returnValue = null;
              if(element.Conjunto.toString().includes(confase[0]) && element.Fase.includes(confase[1])){
                returnValue = element;
              }
              return returnValue;
            });
            //console.log(precursors);
            task = {
              id: levelTasks[i].ID,
              title: levelTasks[i].nomConjunto + " " + levelTasks[i].nomFase + " " + levelTasks[i].Conjunto,
              start: startHour.getTime(),
              end: addHours(startHour, 1).getTime(),
              links: [{type: 4, link: precursors!.ID, color: 'black'}]
            }
          }else if(confase.length == 1){
            let temp = [...this.tasksList].reverse();
            let last = temp.find(element => element.Conjunto === confase[0]);
            console.log(last);
            task = {
              id: levelTasks[i].ID,
              title: `${levelTasks[i].nomConjunto} ${levelTasks[i].nomFase} ${levelTasks[i].Conjunto}`,
              start: startHour.getTime(),
              end: addHours(startHour, 1).getTime(),
              links: [{ type: 4, link: last!.ID, color: 'black' }]
            };
          }
        }else{
          task = {
            id: levelTasks[i].ID,
            title: levelTasks[i].nomConjunto + " " + levelTasks[i].nomFase + " " + levelTasks[i].Conjunto,
            start: startHour.getTime(),
            end: addHours(startHour, 1).getTime()
          }
        }
        this.items = [...this.items, task];
        startHour = task.end ? new Date(task.end) : new Date();
        //prevNv = [...levelTasks].reverse();
      }
      //console.log(this.items);
      //console.log(this.tasksList);
    }
  }
    
    lastReference(): DataBaseRawData{
    let retVal:DataBaseRawData = this.tasksList[0];

    return retVal ?? {};
    }
  */
}
