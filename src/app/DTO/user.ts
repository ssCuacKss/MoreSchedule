export interface User {
    uname: string,
    pass: string,
    admin: boolean,
    disponible: boolean,
    tareas?: {
        tarea: string,
        acaba: string,
        pid: number
    }[]
}
