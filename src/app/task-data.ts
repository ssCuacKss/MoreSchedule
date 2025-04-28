import { GanttItem } from "@worktile/gantt";

export interface TaskData {
    Proyect: string,
    task: GanttItem,
    finished: boolean,
    dateOfFinish: Date,
    worstStart: Date,
    WorstEnd: Date
}
