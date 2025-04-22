import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';


@Component({
  selector: 'app-log-in-screen',
  standalone: false,
  template: `
    <div class="loginInfo">
      <form [formGroup]="loginInfo" (submit)="submitInfo()">
        <label for="areaTextoUsuario">Usuario</label>
        <input type="text" name="Usuario" id="areaTextoUsuario" formControlName="userName">
        <label for="areaTextoPass">Contraseña</label>
        <input type="password" name="userPass" id="areaTextoPass" formControlName="passWord" >
        <input type="submit" value="Iniciar Sesión">
      </form>
    </div>
    
  `,
  styleUrl: './log-in-screen.component.css'
})
export class LogInScreenComponent {

  loginInfo: FormGroup = new FormGroup({
    userName: new FormControl<string>(''),
    passWord: new FormControl<string>(''),
  });

  constructor(private router: Router){

  }


  public submitInfo(): void{

    this.router.navigate(['/Calendar'])
  }
}
