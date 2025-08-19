/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: dbDAO.ts
 * Descripción: Servicio encargado de la creación, edición, eliminación y visualizacion de los datos necesarios.
 * para la operación normal de la app Obteniendo los datos de una API
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 29/04/2025
 * Última modificación: 18/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

import { inject, Injectable } from '@angular/core';
import { User } from './DTO/user';
import { addHours } from 'date-fns';
import { CalendarEvent } from 'angular-calendar';
import { Proyect } from './DTO/proyect';
import { Task } from './DTO/task';
import { Link } from './DTO/link';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, lastValueFrom} from 'rxjs';
import {map} from 'rxjs/operators'
import { CalendarConfig } from './DTO/calendar-config' ;
import { Plantilla } from './DTO/plantilla';
import { TareaPlantilla } from './DTO/tarea-plantilla';
import { LinkPlantilla } from './DTO/link-plantilla';
import { Calendar } from 'dhtmlx-gantt';

@Injectable({
  providedIn: 'root'
})
/**
 * Servicio encargado de obtener, actualizar, borrar y crear los datos necesarios por la app para su funcionamiento
 * Se conecta a una API Express expuesta por nodeJS
 * 
 * 
*/
export class dbDAO {

  private http: HttpClient = inject(HttpClient);

  constructor() { }

  /**
   * Función encargada de obtener un usuario dadas unas credenciales
   * 
   * @param {string} uname nombre del usuario
   * @param {string} pass contraseña del usuario
   * @returns comprobante de la existencia del usuario
   * 
  */

  public async GetUser(uname: string, pass: string): Promise<{user: User, token: string} | undefined> {
    const params = new URLSearchParams({
      uname: uname.trim().toLowerCase(),
      pass: pass.trim()
    });
    const res = await fetch(`http://localhost:3000/users/auth?${params}`);
    if (res.status === 200) {
      let response = await res.json()
      let retVal = {user: response as User, token: response._id}
      return retVal;
    }
    // 404 → usuario no encontrado / credenciales inválidas
    return undefined;
  }

  /**
   * Función encargada de obtener todos los usuarios de la aplicación.
   * 
   * 
   *
   * @returns listado de usuarios
   * 
  */
  public async GetUsers(): Promise<User[]> {
    
    const res = await fetch(`http://localhost:3000/users`);
    if (res.status === 200) {
      return await res.json() as User[];
    }
    // 404 → usuario no encontrado / credenciales inválidas
    return [];
  }

    /**
   * Función encargada de guardar un nuevo usuario.
   * 
   * 
   *
   * @param {User} user usuario a guardar
   * 
  */
  
  public async createUser(user: User): Promise<any> {
    return await lastValueFrom(this.http.post<any>("http://localhost:3000/users/create",
      user))
  }

    /**
   * Función encargada de eliminar un usuario
   * 
   * @param {User} user usuario a borrar
   * 
  */
  public async deleteUser(user: User):Promise<any>{
    const params = new URLSearchParams({
      uname: user.uname,
      pass: user.pass
    });
    return await lastValueFrom(this.http.delete<any>(`http://localhost:3000/user/delete?${params}`))
  }

    /**
   * Función encargada de actualizar los campos de un usuario.
   * 
   * 
   *
   * @param {User} user datos originales del usuario
   * @param {User} update datos modificados del usuario
   * 
  */

  public async updateUsers(user: User, update: User):Promise<any>{
    const body = {
      user: user,
      update: update
    };
    return await lastValueFrom(this.http.post<any>(`http://localhost:3000/user/update`, body))
  }


  /**
   * Función encargada de obtener la configuración temporal del calendario de proyectos.
   * 
   * @returns {Promise<CalendarConfig>} Promesa sobre el objeto de configuración del calendario.
   * 
  */

  public async GetCalendarConfig():Promise<CalendarConfig>{
    const data = (await fetch("http://localhost:3000/calendar/config")).json();
    return data;
  }


    /**
   * Función encargada de obtener un proyecto dado su id si este existe.
   * 
   * @param {number} Pid identificador único del proyecto
   * 
   * @returns Promesa sobre el objeto del proyecto.
   * 
  */

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

    /**
   * Función encargada de obtener una plantilla dado su id si este existe.
   * 
   * @param {number} Tid identificador único de la plantilla
   * 
   * @returns Promesa sobre el objeto de la plantilla.
   * 
  */
  public async GetTemplate(Tid: number): Promise<Plantilla | undefined> {

    const res = await fetch("http://localhost:3000/template?tid=" + Tid);
    if (res.status === 200) {
      return await res.json() as Plantilla;
    }
    return undefined;
  }

    /**
   * Función encargada de obtener todas las plantillas guardadas
   * 
   * 
   * @returns Promesa sobre un Array de plantillas.
   * 
  */
  public async GetTemplates(): Promise<Plantilla[]>{

    let data = await fetch("http://localhost:3000/templates");

    let plantillas: Plantilla[] = (await data.json()) as Plantilla[];
     
    let calendarEvents: CalendarEvent[] = [];


    return plantillas ?? [] ;
  }


      /**
   * Función encargada de obtener las tareas de un proyecto si este existe.
   * 
   * @param {number} id identificador único de proyecto
   * 
   * @returns Promesa sobre un Array de tareas.
   * 
  */

  public async GetProyectTasks(id: number): Promise<Task[]>{

    let data = await fetch("http://localhost:3000/tasks?pid=" + id);
    let tasks = await data.json();
    let parsedTasks: Task [] = [];
    tasks.forEach((task: Task) => {
      parsedTasks.push(
        {
          id: task.id,
          text: task.text,
          start_date: task.start_date,
          duration: task.duration,
          offtime: task.offtime,
          details: task.details,
          slack: task.slack,
          slack_used: task.slack_used,
          progress: task.progress,
          users: task.users ?? []
        }
      )
    });

    return parsedTasks ?? [];
  }

  /**
   * Función encargada de obtener los enlaces de un proyecto si este existe.
   * 
   * @param {number} id identificador único de proyecto
   * 
   * @returns Promesa sobre un Array de enlaces.
   * 
  */

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

    /**
   * Función encargada de guardar tareas y enlaces de un proyecto.
   * 
   * @param {number} pid identificador único de proyecto
   * @param tasks tareas a guardar
   * @param rels enlaces a guardar
   * 
   * 
  */

  public async SaveProyectTasksandLinks(pid: number, tasks: any[], rels:  any[]): Promise<void> {
    const cleanTasks = tasks;
  
    const cleanRels  = rels; 

    //console.log("tareas antes de procesarlas: ", tasks);
    
    const tasksWithPid: Task[] = cleanTasks.map(t => ({ ...t, pid }));
    const linksWithPid:  Link[] = cleanRels.map(l => ({ ...l, pid }));

    //console.log("tareas despues de procesarlas: ", tasksWithPid);

    // 2) Ejecutar ambos batch en paralelo y esperar resultados
    if(tasksWithPid.length !== 0){
      const taskRes = await lastValueFrom(this.createTasksBatch(tasksWithPid));
    }
    if(linksWithPid.length !== 0){
      const LinkRes = await lastValueFrom(this.createLinksBatch(linksWithPid));
    }


  }


  /**
   * Función encargada de actualizar tareas y enlaces de un proyecto.
   * 
   * @param {number} pid identificador único de proyecto
   * @param tasks tareas a actualizar
   * @param rels enlaces a actualizar
   * 
   * 
  */

  public async updateProyectTasks(pid: number, tasks: any[], rels:  any[]): Promise<void> {
    const cleanTasks = tasks;
  
    //console.log("tareas antes de procesarlas: ", tasks);
    
    const tasksWithPid: Task[] = cleanTasks.map(t => ({ ...t, pid }));

    //console.log("tareas despues de procesarlas: ", tasksWithPid);

    // 2) Ejecutar ambos batch en paralelo y esperar resultados
    if(tasksWithPid.length !== 0){
      const taskRes = await lastValueFrom(this.updateTasksBatch(tasksWithPid));
    }
  }

    /**
   * Función encargada de guardar los datos un proyecto.
   * 
   * @param {Proyect} proyect proyecto a guardar
   * 
   * 
  */

  public async createProyect(proyect: Proyect): Promise<void> {
  
    await lastValueFrom(
      this.http.post<number>(
        'http://localhost:3000/proyect/create',
        proyect
      )
    );
  }

    /**
   * Función encargada de guardar las tareas de un proyecto.
   * 
   * @param {Proyect} tasks tareas a guardar
   * 
   * @returns Observable que permite subscripción que devuelve el numero de tareas guardadas
   * 
  */

  public createTasksBatch(tasks: Task[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/tasks/batch`,
      tasks
    );
  }

  /**
   * Función encargada de actualizar las tareas de un proyecto.
   * 
   * @param {Proyect} tasks tareas a actualizar
   * 
   * @returns Observable que permite subscripción que devuelve el numero de tareas actualizadas
   * 
  */

  public updateTasksBatch(tasks: Task[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/tasks/updateBatch`,
      tasks
    );
  }


  /**
   * Función encargada de guardar los enlaces de un proyecto.
   * 
   * @param {Proyect} links enlaces a actualizar
   * 
   * @returns Observable que permite subscripción que devuelve el numero de enlaces actualizados
   * 
  */

  public createLinksBatch(links: Link[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/links/batch`,
      links
    );
  }
    /**
   * Función encargada de eliminar todos los datos de un proyecto.
   * 
   * @param {number} pid identificador único del proyecto
   * 
   * @returns Promesa que devuelve el numero de enlaces y tareas eliminadas
   * 
  */


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


  /**
   * Función encargada de actualizar la configuración del calendario.
   * 
   * @param {CalendarConfig} config Configuración actual del calendario
   * 
   * @returns Promesa con el número de elementos actualizados.
   * 
  */

  updateCalendarConfigPromise(config: CalendarConfig): Promise<number>{
    return lastValueFrom(this.updateCalendarConfig(config))
  }

    /**
   * Función encargada de actualizar la configuración del calendario.
   * 
   * @param {CalendarConfig} config Configuración actual del calendario
   * 
   * @returns Observable con el número de elementos actualizados.
   * 
  */
  
  updateCalendarConfig(config: CalendarConfig): Observable<number>{
    return this.http.post<number>('http://localhost:3000/calendar/config/update',
      config
    );
  }

  /**
   * Función encargada de eliminar todos los datos de un proyecto.
   * 
   * @param {number} pid identificador único del proyecto
   * 
   * @returns Observable que permite suscripcion que devuelve el numero de enlaces y tareas eliminadas
   * 
  */

  deleteProyectByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<{ deletedCount: number }>(
        'http://localhost:3000/proyect/delete',
        { params }
      )
      .pipe(map(res => res.deletedCount));
  }

  /**
   * Función encargada de eliminar un proyecto.
   * 
   * @param {number} pid identificador único del proyecto
   * 
   * @returns Promise que devuelve > 0 si el proyecto fue eliminado
   * 
  */

  deleteProyectByPidPromise(pid: number): Promise<number> {
    return lastValueFrom(this.deleteProyectByPid(pid));
  }

  
  /**
   * Función encargada de eliminar las tareas de un proyecto.
   * 
   * @param {number} pid identificador único del proyecto
   * 
   * @returns Observable que devuelve > 0 si las tareas fueron eliminadas
   * 
  */


  public deleteTasksByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/tasks`, { params })
      .pipe(map(res => res.deletedCount));
  }

    /**
   * Función encargada de eliminar los links de un proyecto.
   * 
   * @param {number} pid identificador único del proyecto
   * 
   * @returns Observable que devuelve > 0 si los links fueron eliminados
   * 
  */
  public deleteLinksByPid(pid: number): Observable<number> {
    const params = new HttpParams().set('pid', pid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/links`, { params })
      .pipe(map(res => res.deletedCount));
  }

      /**
   * Función encargada de obtener todos los proyectos de la aplicación
   * 
   * 
   * @returns Promise con la lista de proyectos de la aplicación
   * 
  */

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

    /**
   * Función encargada de eliminar una plantilla.
   * 
   * @param {number} tid identificador único de la plantilla
   * 
   * @returns Observable que devuelve > 0 si el proyecto fue eliminado
   * 
  */

  public deleteTemplateByTid(tid: number): Observable<number> {
    const params = new HttpParams().set('tid', tid.toString());
    return this.http
      .delete<{ deletedCount: number }>(
        'http://localhost:3000/template/delete',
        { params }
      )
      .pipe(map(res => res.deletedCount));
  }

    /**
   * Función encargada de eliminar una plantilla.
   * 
   * @param {number} tid identificador único de la plantilla
   * 
   * @returns Promise que devuelve > 0 si el proyecto fue eliminado
   * 
  */

   public deleteTemplateByTidPromise(tid: number): Promise<number> {
    return lastValueFrom(this.deleteTemplateByTid(tid));
  }

      /**
   * Función encargada de eliminar las tareas de una plantilla.
   * 
   * @param {number} tid identificador único de la plantilla
   * 
   * @returns Observable que devuelve > 0 si la plantilla fue eliminada
   * 
  */

  public deleteTemplateTasksByPid(tid: number): Observable<number> {
    const params = new HttpParams().set('tid', tid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/template/tasks`, { params })
      .pipe(map(res => res.deletedCount));
  }

    /**
   * Función encargada de eliminar los links de una plantilla
   * 
   * @param {number} tid identificador único de la plantilla
   * 
   * @returns Observable que devuelve > 0 si los links fueron eliminados
   * 
  */
  
  public deleteTemplateLinksByPid(tid: number): Observable<number> {
    const params = new HttpParams().set('tid', tid.toString());
    return this.http
      .delete<any>(`http://localhost:3000/template/links`, { params })
      .pipe(map(res => res.deletedCount));
  }

  /**
   * Función encargada de eliminar todos los datos de una plantilla
   * 
   * @param {number} tid identificador único de la plantilla
   * 
   * @returns Promise que devuelve > 0 si los links fueron eliminados
   * 
  */

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


    /**
   * Función encargada de guardar una plantilla
   * 
   * @param {Plantilla} template plantilla a guardar
   * 
   * 
  */

  public async createTemplate(template: Plantilla): Promise<void> {
  
    await lastValueFrom(
      this.http.post<number>(
        'http://localhost:3000/templates/create',
        template
      )
    );
  }

    /**
   * Función encargada de guardar las tareas de una plantilla.
   * 
   * @param {TareaPlantilla[]} tasks tareas a guardar
   * 
   * @returns Observable que permite subscripción que devuelve el numero de tareas actualizadas
   * 
  */


  public createTemplateTasksBatch(tasks: TareaPlantilla[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/template/tasks/batch`,
      tasks
    );
  }

  /**
   * Función encargada de guardar los enlaces de una plantilla.
   * 
   * @param {LinkPlantilla[]} links Enalces a guardar
   * 
   * @returns Observable que permite subscripción que devuelve el numero de enlaces actualizados
   * 
  */

  public createTemplateLinksBatch(links: LinkPlantilla[]): Observable<number> {
    return this.http.post<number>(
      `http://localhost:3000/template/links/batch`,
      links
    );
  }

    /**
   * Función encargada de guardar los enlaces y tareas de una plantilla.
   * 
   * @param {TareaPlantilla[]}tasks tareas a guardar
   * @param {LinkPlantilla[]} rels enalces a guardar
   * 
   * @returns Observable que permite subscripción que devuelve el numero de enlaces actualizados
   * 
  */

  public async SaveTemplateTasksandLinks(tasks: TareaPlantilla[], rels:  LinkPlantilla[]): Promise<void> {

  // 2) Ejecutar ambos batch en paralelo y esperar resultados
    if(tasks.length !== 0){
      const taskRes = await lastValueFrom(this.createTemplateTasksBatch(tasks));
    }
    if(rels.length !== 0){
      const LinkRes = await lastValueFrom(this.createTemplateLinksBatch(rels));
    }

  }

    /**
   * Función encargada de obtener las tareas de una plantilla dado el id.
   * 
   * @param {number} id identificador único de la plantilla
   * 
   * @returns Promsea sobre el Array de tareas de la plantilla
   * 
  */

  public async GetTemplateTasks(id: number): Promise<TareaPlantilla[]>{

    let data = await fetch("http://localhost:3000/template/tasks?tid=" + id);
    let tasks = await data.json();
    let parsedTasks: TareaPlantilla [] = [];
    tasks.forEach((task: any) => {
      parsedTasks.push(
        {
          tid: task.tid,
          id: task.id,
          text: task.text,
          start_date: task.start_date,
          duration: task.duration,
          user_count: task.user_count
        }
      )
    });

    return parsedTasks ?? [];
  }

  /**
   * Función encargada de obtener los enlaces de una plantilla dado el id.
   * 
   * @param {number} id identificador único de la plantilla
   * 
   * @returns Promsea sobre el Array de enlaces de la plantilla
   * 
  */

  public async GetTemplateLinks(id: number): Promise<LinkPlantilla[]>{

    let data = await fetch("http://localhost:3000/template/links?tid=" + id);
    let Links = await data.json();
    let parsedLinks: LinkPlantilla[] = [];
    Links.forEach((link: any) => {
      parsedLinks.push(
        {
          tid: link.tid,
          id: link.id,
          source: link.source,
          target: link.target,
          type: link.type
        }
      )
    });
    
    return parsedLinks ?? [];
  }
}
