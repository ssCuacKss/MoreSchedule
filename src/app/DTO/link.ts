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
