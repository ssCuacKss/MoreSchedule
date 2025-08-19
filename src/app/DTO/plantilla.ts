/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: plantilla.ts
 * Descripción: Fichero que especifica la interfaz para los datos una plantilla
 * servida por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 23/04/2025
 * Última modificación: 19/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */


/**
 * Intefaz para los datos de configuración de una plantilla.
 * 
 * @interface Plantilla
 */

export interface Plantilla {

    /** Identificador único de la plantilla*/
    id: number,
    /** Duración de la plantilla en horas*/
    end: number,

    /** Nombre de la plantilla*/
    title: string
    
}
