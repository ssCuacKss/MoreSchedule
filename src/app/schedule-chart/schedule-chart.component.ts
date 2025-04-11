import { AfterViewInit, Component } from '@angular/core';
import { GanttItem} from '@worktile/gantt';
@Component({
  selector: 'app-schedule-chart',
  standalone: false,
  template: `
    <p>
      schedule-chart works!
      <ngx-gantt #gantt [items]="items">
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

  items: GanttItem[] = [{
    id: '000000',
    title: 'Task 0',
    start: new Date('2021-07-31T08:00:00'),
    end: new Date('2021-08-08T17:00:00')
  },
  {
    id: '000001',
    title: 'Task 1',
    start: new Date('2021-04-02T08:00:00'),
    end: new Date('2021-07-05T17:00:00')
  }];


  constructor() {}

}
