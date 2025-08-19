/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: task.ts
 * Descripción: Fichero que especifica la interfaz para los datos una tarea de un proyecto
 * servida por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 25/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

/**
 * Intefaz para los datos de las Tareas de una plantilla.
 * 
 * @interface Plantilla
 */


export interface Task {

    /** Identificador de una tarea dentro de un proyecto*/
    id: number,
    /** Nombre de la tarea dentro del proyecto*/
    text: string,
    /** Fecha de inicio de la tarea*/
    start_date: string,
    /** Duración de la tarea en minutos*/
    duration: number,
    /** Tiempo que la tarea pasa fuera de tiempo lectivo*/
    offtime: number,
    /** Observaciones de la tarea dentro del proyecto*/
    details: string,
    /** holgura calculada que tiene una tarea*/
    slack: number,
    /** Tiempo extra usado desde el fin óptimo de la tarea*/
    slack_used: number,
    /** Progreso de la tarea normalizado (rango 0-1)*/
    progress: number,
    /** Lista de usuarios asignados a la tarea*/
    users: {
        /** Nombre de un usuario asignado a la tarea*/
        uname: string
    }[]
}

