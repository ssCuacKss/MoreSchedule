import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {GANTT_GLOBAL_CONFIG, NgxGanttModule} from '@worktile/gantt'
import { AppComponent } from '../app.component';
import { ScheduleChartComponent } from '../schedule-chart/schedule-chart.component';
import { BrowserModule } from '@angular/platform-browser';
import { provideRouter, RouterModule, RouterOutlet } from '@angular/router';
import { LogInScreenComponent } from '../log-in-screen/log-in-screen.component';
import routeConfig from '../routes';
import { ReactiveFormsModule} from '@angular/forms';

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
    ReactiveFormsModule
  
  ],
  providers: [
    {
      provide: GANTT_GLOBAL_CONFIG,
      useValue: {
        locale: 'en-us'
      }
    },
    provideRouter(routeConfig)
  ],
  bootstrap: [AppComponent]   
})
export class GanttEditorModule { }
