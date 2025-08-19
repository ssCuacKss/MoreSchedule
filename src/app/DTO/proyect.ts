/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: proyect.ts
 * Descripción: Fichero que especifica la interfaz para los datos un proyecto
 * servido por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 25/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

/**
 * Intefaz para los datos de configuración de una plantilla.
 * 
 * @interface Proyect
 */

export interface Proyect {
    /** Identificador único del proyecto*/
    id: number,

    /** Fecha de inicio del proyecto*/
    start: string,
    /** Duración del proyecto en horas*/
    end: number,
    /** Nombre del proyecto*/
    title: string,
    /** Propiedades necesarias para mostrar en el calendario*/
    color: {
        primary: string,
        secondary: string
    }
}
