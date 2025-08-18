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
