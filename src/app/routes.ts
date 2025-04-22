import { Routes } from "@angular/router";
import { ScheduleChartComponent } from "./schedule-chart/schedule-chart.component";
import { LogInScreenComponent } from "./log-in-screen/log-in-screen.component";
import { ScheduleCalendarComponent } from "./schedule-calendar/schedule-calendar.component";

const routeConfig: Routes = [

    {
        path: '',
        component: LogInScreenComponent,
        title: 'Bienvenido a MoreSchedule'
    },
    {
        path:'proyectSchdedule',
        component: ScheduleChartComponent,
        title: 'MoreScheduler'
    },
    {
        path: 'Calendar',
        component: ScheduleCalendarComponent,
        title: 'MoreScheduler'
    }

];

export default routeConfig;