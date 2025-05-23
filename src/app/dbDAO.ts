import { inject, Injectable } from '@angular/core';
import { DataBaseRawData } from './data-base-raw-data';
import { User } from './user';
import { addHours, parse } from 'date-fns';
import { CalendarEvent } from 'angular-calendar';
import { Proyect } from './proyect';
import { Task } from './task';
import { Link } from './link';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import {map} from 'rxjs/operators'

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

  public async SaveProyectTasksandLinks(id: number, tasks: any, rels: any): Promise<void>{

    //let data = await fetch("http://localhost:3000/data");
    //let prueba = data.json();
    console.log(tasks, rels);
  }
  deleteTasksByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/tasks`, { params })
      .pipe(map(res => res.deletedCount));
  }

  /** Borra todos los links cuyo pid coincida */
  deleteLinksByPid(pid: number): Observable<number> {
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

    console.log(calendarEvents);

    return calendarEvents ?? [] ;
  }

}
