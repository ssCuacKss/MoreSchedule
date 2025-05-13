import { Injectable } from '@angular/core';
import { DataBaseRawData } from './data-base-raw-data';
import { User } from './user';
import { parse } from 'date-fns';
import { find } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyectTasksService {

  private url: string = "http://localhost:3000/data";
  private tasksList: DataBaseRawData[] = [];

  constructor() { }

  public async GetProyectTasks(): Promise<DataBaseRawData[]>{

    let data = await fetch("http://localhost:3000/data");
    let prueba = data.json();
    return prueba ?? [];
  }


  public async GetUser(user: string, pass: string): Promise<User | undefined>{

    let data = await fetch("http://localhost:3000/users");
    let users: User[] =  await data.json();

    let validUser = users.find(u => u.uname.trim().toLowerCase() === user.trim().toLowerCase() && u.pass.trim() === pass.trim());

    return validUser; 
  }

}
