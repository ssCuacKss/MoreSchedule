import { LOCALE_ID, NgModule } from '@angular/core';
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
    LogInScreenComponent   
  ],
  imports: [
    BrowserModule,
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
  providers:[
    {
      provide: LOCALE_ID, useValue: 'en-US'
    },
    provideRouter(routeConfig)
  ],
  bootstrap: [AppComponent]   
})
export class GanttEditorModule { }
