
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
