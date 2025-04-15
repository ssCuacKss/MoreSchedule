import { Component, AfterViewInit, ElementRef, ViewChild,} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GanttEditorModule } from './gantt-editor/gantt-editor.module';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
   <h1>Welcome to {{title}}!</h1>
    
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent{
  title = 'MoreSchedule';
  
}
