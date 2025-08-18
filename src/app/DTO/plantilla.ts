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
