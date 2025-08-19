/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: link-plantilla.ts
 * Descripción: Fichero que especifica la interfaz para los datos de los enlaces entre tareas de una plantilla
 * servidos por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Pueba <i92ropup@uco.es>
 * Fecha de creación: 23/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */


/**
 * Intefaz para los datos de los enlaces entre tareas de una plantilla.
 * 
 * @interface LinkPlantilla
 */

export interface LinkPlantilla {
    /** Identificador de la plantilla a la que pertenece el enlace*/
    tid: number,
    /** Identificador del enlace de un enlace dentro de una plantilla*/
    id: number,
    /** identificador de la tarea desde la que se origina el enlace*/
    source: number,
    /** Idetificador de la tarea hacia la que se dirige el enlace*/
    target: number,
    /** Tipo de relación entre tareas*/
    type: string
}
