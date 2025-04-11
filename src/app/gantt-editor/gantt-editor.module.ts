import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {GANTT_GLOBAL_CONFIG, NgxGanttModule} from '@worktile/gantt'
import { AppComponent } from '../app.component';
import { ScheduleChartComponent } from '../schedule-chart/schedule-chart.component';
import { BrowserModule } from '@angular/platform-browser';



@NgModule({
  declarations: [
    AppComponent,             
    ScheduleChartComponent    
  ],
  imports: [
    BrowserModule,
    NgxGanttModule     
  ],
  providers: [
    {
      provide: GANTT_GLOBAL_CONFIG,
      useValue: {
        locale: 'en-us'
      }
    }
  ],
  bootstrap: [AppComponent]   
})
export class GanttEditorModule { }
