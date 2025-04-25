import { Component } from '@angular/core';
import { GanttItem, GanttViewType} from '@worktile/gantt';

@Component({
  selector: 'app-schedule-chart',
  standalone: false,
  template: `
    <div class="scheduleWindow">
      <ngx-gantt #gantt [items]="items" [viewType]='view' [start]="start" [end]="end">
        <ngx-gantt-table>
          <ngx-gantt-column name="Titulo" width="300px">
            <ng-template #cell let-item="item"> {{ item.title }} </ng-template>
          </ngx-gantt-column>
        </ngx-gantt-table>
      </ngx-gantt>
      
    <div>

  `,
  styleUrl: './schedule-chart.component.css'
})
export class ScheduleChartComponent{

  view = GanttViewType.hour;
  start = new Date('2025-07-28').getTime();
  end = new Date('2025-08-02').getTime();
  drag = false;

  items: GanttItem[] = [
    {
      id: '000000',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000001', color: 'black'}],
      color: "green"
    },
    {
      id: '000001',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    },{
      id: '000002',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000003', color: 'black'}],
      color: "green"
    },
    {
      id: '000003',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    },{
      id: '000004',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000005', color: 'black'}],
      color: "green"
    },
    {
      id: '000005',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    },{
      id: '000006',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000007', color: 'black'}],
      color: "green"
    },
    {
      id: '000007',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    },{
      id: '000008',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000009', color: 'black'}],
      color: "green"
    },
    {
      id: '000009',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    },{
      id: '000010',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000011', color: 'black'}],
      color: "green"
    },
    {
      id: '000011',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    },{
      id: '000012',
      title: 'Task 0',
      start: new Date('2025-07-28T08:00:00'),
      end: new Date('2025-07-28T17:00:00'),
      expandable: true,
      draggable: true,
      links: [{type: 1, link: '000013', color: 'black'}],
      color: "green"
    },
    {
      id: '000013',
      title: 'Task 1',
      start: new Date('2025-07-28T18:00:00'),
      end: new Date('2025-07-28T19:30:00'),
      expandable: true,
      draggable: true
    }
  ];

  constructor() {}

}
