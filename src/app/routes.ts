/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: routes.ts
 * Descripción: Fichero que especifica las rutas de navegación dentro de la SPA.
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 20/04/2025
 * Última modificación: 18/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

import { Routes } from "@angular/router";
import { ScheduleChartComponent } from "./schedule-chart/schedule-chart.component";
import { LogInScreenComponent } from "./log-in-screen/log-in-screen.component";
import { ScheduleCalendarComponent } from "./schedule-calendar/schedule-calendar.component";


// variable que almacena las rutas de las vistas de la aplicación junto con el componente que debe cargar
const routeConfig: Routes = [

    {
        // ruta para la página de login, carga el componente LogInScreenComponent
        path: '',
        component: LogInScreenComponent,
        title: 'Bienvenido a MoreSchedule'
    },
    {
        //ruta para la página de la tabla gantt de edición o visualización de proyectos y plantillas, carca el componente ScheduleChartComponent
        path:'proyectSchedule',
        component: ScheduleChartComponent,
        title: 'MoreScheduler'
    },
    {
        //ruta para la página de calendario de proyectos, carga el componente ScheduleCalendarComponent
        path: 'Calendar',
        component: ScheduleCalendarComponent,
        title: 'MoreScheduler'
    }

];

export default routeConfig;