/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: calendar-config.ts
 * Descripción: Fichero que especifica la interfaz para los datos de configuración del calendario servidos
 * por el backend de la aplicación. Fácilmente interpretable por el sistema
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 30/04/2025
 * Última modificación: 18/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */



/**
 * Intefaz para los datos de la configuración temporal del calendario de la aplicación.
 * 
 * @interface CalendarConfig
 */


export interface CalendarConfig {

    /** Hora de entrada laboral*/
    entrada: string,
    /** Hora de salida laboral*/
    salida: string,
    /** Lista de dias festivos a considerar*/
    festivos:[ {
        /** Día de inicio de la festividad*/        
        diaInicio: string,
        /** Día de finalización de la festividad, puede no existir*/
        diaFin: string | undefined
    }]
}
