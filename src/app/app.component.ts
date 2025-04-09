import { Component, AfterViewInit, ElementRef, ViewChild, viewChild} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import Gantt from 'frappe-gantt'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
   <h1>Welcome to {{title}}!</h1>
    <div #ganttContainer ></div>
    <router-outlet />
  `,
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit{
  title = 'MoreSchedule';
  @ViewChild('ganttContainer', {static: true}) ganttContainer!:ElementRef;

  ngAfterViewInit(): void {
    const tasks = [
      {
        id: 'Task 1',
        name: 'Tarea 1',
        start: '2025-04-01',
        end: '2025-04-05',
        progress: 20,
      },
      {
        id: 'Task 2',
        name: 'Tarea 2',
        start: '2025-04-03',
        end: '2025-04-10',
        progress: 40,
        dependencies: 'Task 1'
      }
    ];

    new Gantt(this.ganttContainer.nativeElement, tasks, {container_height: 700});

  }
}
