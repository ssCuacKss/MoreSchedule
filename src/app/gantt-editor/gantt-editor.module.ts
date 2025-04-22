import { CommonModule } from '@angular/common';
import { LOCALE_ID, NgModule } from '@angular/core';
import {GANTT_GLOBAL_CONFIG, NgxGanttModule} from '@worktile/gantt'
import { AppComponent } from '../app.component';
import { ScheduleChartComponent } from '../schedule-chart/schedule-chart.component';
import { BrowserModule } from '@angular/platform-browser';
import { provideRouter, RouterModule, RouterOutlet } from '@angular/router';
import { LogInScreenComponent } from '../log-in-screen/log-in-screen.component';
import routeConfig from '../routes';
import { ReactiveFormsModule} from '@angular/forms';
import {CalendarModule, DateAdapter, MOMENT} from 'angular-calendar';
import {SchedulerModule} from 'angular-calendar-scheduler';
import {adapterFactory} from 'angular-calendar/date-adapters/moment'

import moment from 'moment';

@NgModule({
  declarations: [
    AppComponent,             
    ScheduleChartComponent,
    LogInScreenComponent   
  ],
  imports: [
    BrowserModule,
    NgxGanttModule,
    RouterOutlet,
    RouterModule,
    ReactiveFormsModule,
    CalendarModule.forRoot(
      {
        provide: DateAdapter,
        useFactory: () => adapterFactory(moment)
      }
    ),
    SchedulerModule.forRoot({ locale: 'en', headerDateFormat: 'daysRange' })
  
  ],
  providers: [
    {
      provide: GANTT_GLOBAL_CONFIG,
      useValue: {
        locale: 'en-us'
      }
    },
    {
      provide: LOCALE_ID, useValue: 'en-US'
    },
    provideRouter(routeConfig)
  ],
  bootstrap: [AppComponent]   
})
export class GanttEditorModule { }
