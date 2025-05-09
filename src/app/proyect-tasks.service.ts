import { Injectable } from '@angular/core';
import { DataBaseRawData } from './data-base-raw-data';

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


}
