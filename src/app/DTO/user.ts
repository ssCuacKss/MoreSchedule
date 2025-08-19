/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: user.ts
 * Descripción: Fichero que especifica la interfaz para los datos un usuario de la aplicación
 * servido por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Pueba <i92ropup@uco.es>
 * Fecha de creación: 21/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */


/**
 * Intefaz para los datos de los usuarios de la aplicación y las tareas a las que están asociados.
 * 
 * @interface User
 */

export interface User {
    /** Nombre de usuario (identificador único) mínimo una letra, minúsculas*/
    uname: string,

    /** Contraseña de usuario mínimo 4 caracteres, minúsculas, mayusculas y números*/
    pass: string,

    /** Marca a un usuario como válido para inicio de sesión*/
    admin: boolean,
    /** Marca a un usuario como válido para asignarle tareas*/
    disponible: boolean,

    /** Conjunto de tareas asociadas a un usuario*/
    tareas?: {

        /** Nombre de la tarea asignada al usuario*/
        tarea: string,
        
        /** Fecha de finalización propuesta para la tarea*/
        acaba: string,

        /** Identificador único del proyecto al que pertenece la tarea*/
        pid: number,
        
        /** Identificador de la tarea dentro de un proyecto*/
        tid: number 
    }[]
}
