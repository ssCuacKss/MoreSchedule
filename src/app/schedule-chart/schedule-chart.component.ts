import { AfterViewInit, Component } from '@angular/core';
import { GanttItem, GanttLink, GanttViewType} from '@worktile/gantt';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-schedule-chart',
  standalone: false,
  template: `
    <p>
      <ngx-gantt #gantt [items]="items" [viewType]='view' [start]="start" [end]="end">
        <ngx-gantt-table>
          <ngx-gantt-column name="Title" width="300px">
            <ng-template #cell let-item="item"> {{ item.title }} </ng-template>
          </ngx-gantt-column>
        </ngx-gantt-table>
      </ngx-gantt>
      
    </p>
  `,
  styleUrl: './schedule-chart.component.css'
})
export class ScheduleChartComponent{

  view = GanttViewType.day;
  start = new Date('2025-07-26').getTime();
  end = new Date('2025-08-03').getTime();

  items: GanttItem[] = [
    {
      id: '000000',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-29T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000001', color: 'black'}]
    },
    {
      id: '000001',
      title: 'Task 1',
      start: new Date('2025-08-02T08:00:00'),
      end: new Date('2025-08-02T17:00:00'),
      expandable: true,
      draggable: true
    }
  ];

  constructor() {}

}
