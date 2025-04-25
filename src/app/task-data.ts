import { GanttItem } from "@worktile/gantt";

export interface TaskData {
    task: GanttItem,
    finished: boolean,
    worstStart: Date,
    WorstEnd: Date
}
