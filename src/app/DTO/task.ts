export interface Task {
    id: number,
    text: string,
    start_date: string,
    duration: number,
    offtime: number,
    details: string,
    slack: number,
    slack_used: number,
    progress: number,
    users: {
        uname: string
    }[]
}

