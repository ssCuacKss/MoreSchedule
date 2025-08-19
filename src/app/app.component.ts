/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: app.component.ts
 * Descripción: Componente encargado de insertar y presentar las diferentes vistas de la aplicación
 * Fecha de creación: 18/04/2025
 * Última modificación: 18/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */

import { Component} from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule],
  standalone: true,
  template: `
  <!--Componente de enrutado de angular, en función de la ruta activa carga uno de los componentes de la aplicación-->
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent{
  title = 'MoreSchedule';
  
}
