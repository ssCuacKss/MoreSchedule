/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: tarea-plantilla.ts
 * Descripción: Fichero que especifica la interfaz para los datos una tarea de una plantilla
 * servida por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 23/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

/**
 * Intefaz para los datos de las Tareas de una plantilla.
 * 
 * @interface TareaPlantilla
 */

export interface TareaPlantilla {
    /** Identificador único de la plantilla a la que pertenece la tarea*/
    tid: number,
    /** Identificador único de la tarea dentro de la plantilla*/
    id: number,
    /** Nombre de la tarea*/
    text: string,
    /** Retardo en horas entre inicio de proyecto e inicio de tarea*/
    start_date: number,
    /** Duración de la tarea en minutos*/
    duration: number,
    /** Número de usuarios que deben asignarse a la tarea*/
    user_count: number

}
