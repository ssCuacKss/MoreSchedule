/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: link.ts
 * Descripción: Fichero que especifica la interfaz para los datos de los enlaces entre tareas de un proyecto
 * servidos por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Pueba <i92ropup@uco.es>
 * Fecha de creación: 25/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

/**
 * Intefaz para los datos de los enlaces entre tareas de un proyecto.
 * 
 * @interface Link
 */

export interface Link {
    /** Identificador de un enlace entre tareas dentro de un proyecto*/
    id: number,

    /** identificador de la tarea desde la que se origina el enlace*/
    source: number,
    /** Idetificador de la tarea hacia la que se dirige el enlace*/
    target: number,
    /** Tipo de relación entre tareas*/
    type: string
}
