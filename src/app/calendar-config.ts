export interface CalendarConfig {

    entrada: string,
    salida: string,
    festivos:[ {        
        diaInicio: string,
        diaFin: string | undefined
    }]
}
