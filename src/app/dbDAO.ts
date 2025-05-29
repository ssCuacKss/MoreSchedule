import { inject, Injectable } from '@angular/core';
import { DataBaseRawData } from './data-base-raw-data';
import { User } from './user';
import { addHours, parse } from 'date-fns';
import { CalendarEvent } from 'angular-calendar';
import { Proyect } from './proyect';
import { Task } from './task';
import { Link } from './link';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, lastValueFrom} from 'rxjs';
import {map} from 'rxjs/operators'
import { AnyCatcher } from 'rxjs/internal/AnyCatcher';
import { CalendarConfig } from './calendar-config' ;
import { Plantilla } from './plantilla';

@Injectable({
  providedIn: 'root'
})
export class dbDAO {

  private url: string = "http://localhost:3000/";
  private tasksList: DataBaseRawData[] = [];
  private http: HttpClient = inject(HttpClient);

  constructor() { }

  public async GetUser(uname: string, pass: string): Promise<User | undefined> {
    const params = new URLSearchParams({
      uname: uname.trim().toLowerCase(),
      pass: pass.trim()
    });
    const res = await fetch(`http://localhost:3000/users/auth?${params}`);
    if (res.status === 200) {
      return await res.json() as User;
    }
    // 404 → usuario no encontrado / credenciales inválidas
    return undefined;
  }

  public async GetCalendarConfig():Promise<CalendarConfig>{
    const data = (await fetch("http://localhost:3000/calendar/config")).json();
    return data;
  }

  public async GetProyect(Pid: number): Promise<Proyect | undefined> {
    const params = new URLSearchParams({
      pid: Pid.toString() 
    });
    const res = await fetch("http://localhost:3000/proyect?pid=" + Pid);
    if (res.status === 200) {
      return await res.json() as Proyect;
    }
    return undefined;
  }


    public async GetTemplate(Tid: number): Promise<Plantilla | undefined> {

    const res = await fetch("http://localhost:3000/template?tid=" + Tid);
    if (res.status === 200) {
      return await res.json() as Plantilla;
    }
    return undefined;
  }


  public async GetTemplates(): Promise<Plantilla[]>{

    let data = await fetch("http://localhost:3000/templates");

    let plantillas: Plantilla[] = (await data.json()) as Plantilla[];
     
    let calendarEvents: CalendarEvent[] = [];


    return plantillas ?? [] ;
  }

  public async GetProyectTasks(id: number): Promise<Task[]>{

    let data = await fetch("http://localhost:3000/tasks?pid=" + id);
    let tasks = await data.json();
    let parsedTasks: Task [] = [];
    tasks.forEach((task: any) => {
      parsedTasks.push(
        {
          id: task.id,
          text: task.text,
          start_date: task.start_date,
          duration: task.duration
        }
      )
    });

    return parsedTasks ?? [];
  }

  public async GetProyectLinks(id: number): Promise<Link[]>{

    let data = await fetch("http://localhost:3000/links?pid=" + id);
    let Links = await data.json();
    let parsedLinks: Link [] = [];
    Links.forEach((link: any) => {
      parsedLinks.push(
        {
          id: link.id,
          source: link.source,
          target: link.target,
          type: link.type
        }
      )
    });

    return parsedLinks ?? [];
  }

  public async SaveProyectTasksandLinks(
    pid: number,
    tasks: any[],
    rels:  any[]
  ): Promise<void> {
    const cleanTasks = tasks.map(({ color, end_date, parent, progress, ...t }) => t);
  // si tus links no tienen esas props, puedes omitir este paso para ellos
  const cleanRels  = rels; 

  // 1) Añadir pid a cada tarea y a cada enlace
  const tasksWithPid: Task[] = cleanTasks.map(t => ({ ...t, pid }));
  const linksWithPid:  Link[] = cleanRels.map(l => ({ ...l, pid }));

  // 2) Ejecutar ambos batch en paralelo y esperar resultados
  if(tasksWithPid.length !== 0){
    const taskRes = await lastValueFrom(this.createTasksBatch(tasksWithPid));
  }
  if(linksWithPid.length !== 0){
    const LinkRes = await lastValueFrom(this.createLinksBatch(linksWithPid));
  }


  }

  public async createProyect(proyect: Proyect): Promise<void> {
  
    await lastValueFrom(
      this.http.post<number>(
        'http://localhost:3000/proyect/create',
        proyect
      )
    );
  }

  public createTasksBatch(tasks: Task[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/tasks/batch`,
      tasks
    );
  }

  public createLinksBatch(links: Link[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/links/batch`,
      links
    );
  }

  public async deleteAllByPidPromise(pid: number): Promise<{
    tasksDeleted: number;
    linksDeleted: number;
  }> {
    // Convertimos Observables a Promises
    const tasksPromise = lastValueFrom(this.deleteTasksByPid(pid));
    const linksPromise = lastValueFrom(this.deleteLinksByPid(pid));

    // Ejecutamos en paralelo
    const [tasksDeleted, linksDeleted] = await Promise.all([
      tasksPromise,
      linksPromise
    ]);

    return { tasksDeleted, linksDeleted };
  }

  updateCalendarConfigPromise(config: CalendarConfig): Promise<number>{
    return lastValueFrom(this.updateCalendarConfig(config))
  }

  updateCalendarConfig(config: CalendarConfig): Observable<number>{
    return this.http.post<number>('http://localhost:3000/calendar/config/update',
      config
    );
  }

  deleteProyectByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<{ deletedCount: number }>(
        'http://localhost:3000/proyect/delete',
        { params }
      )
      .pipe(map(res => res.deletedCount));
  }

  deleteProyectByPidPromise(pid: number): Promise<number> {
    return lastValueFrom(this.deleteProyectByPid(pid));
  }



  public deleteTasksByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/tasks`, { params })
      .pipe(map(res => res.deletedCount));
  }

  /** Borra todos los links cuyo pid coincida */
  public deleteLinksByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/links`, { params })
      .pipe(map(res => res.deletedCount));
  }

  public async GetProyects(): Promise<CalendarEvent[] | undefined>{

    let data = await fetch("http://localhost:3000/proyects");

    let proyects: Proyect[]= (await data.json()) as Proyect[];
     
    let calendarEvents: CalendarEvent[] = []

    proyects.forEach((proyect: Proyect) =>{
      calendarEvents.push({
        id: proyect.id,
        start: new Date(proyect.start),
        end: addHours(new Date(proyect.start), proyect.end),
        title: proyect.title,
        color:{
          primary: proyect.color.primary,
          secondary: proyect.color.secondary
        }
      })
    });

    return calendarEvents ?? [] ;
  }

  public deleteTemplateByTid(tid: number): Observable<number> {
    const params = new HttpParams().set('tid', tid.toString());
    return this.http
      .delete<{ deletedCount: number }>(
        'http://localhost:3000/template/delete',
        { params }
      )
      .pipe(map(res => res.deletedCount));
  }

   public deleteTemplateByTidPromise(tid: number): Promise<number> {
    return lastValueFrom(this.deleteTemplateByTid(tid));
  }

  

  public deleteTemplateTasksByPid(tid: number): Observable<number> {
    const params = new HttpParams().set('tid', tid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/template/tasks`, { params })
      .pipe(map(res => res.deletedCount));
  }

  /** Borra todos los links cuyo pid coincida */
  public deleteTemplateLinksByPid(tid: number): Observable<number> {
    const params = new HttpParams().set('tid', tid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/template/links`, { params })
      .pipe(map(res => res.deletedCount));
  }

  public async deleteTemplateAllByPidPromise(tid: number): Promise<{
    tasksDeleted: number;
    linksDeleted: number;
  }> {
    // Convertimos Observables a Promises
    const tasksPromise = lastValueFrom(this.deleteTemplateTasksByPid(tid));
    const linksPromise = lastValueFrom(this.deleteTemplateLinksByPid(tid));

    // Ejecutamos en paralelo
    const [tasksDeleted, linksDeleted] = await Promise.all([
      tasksPromise,
      linksPromise
    ]);

    return { tasksDeleted, linksDeleted };
  }

    public async createTemplate(template: Plantilla): Promise<void> {
  
    await lastValueFrom(
      this.http.post<number>(
        'http://localhost:3000/templates/create',
        template
      )
    );
  }

}
