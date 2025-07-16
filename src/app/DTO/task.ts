export interface Task {
    id: number,
    text: string,
    start_date: string,
    duration: number,
    users: {
        uname: string
    }[]
}
