import { Component, ElementRef, inject} from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { ProyectTasksService } from '../proyect-tasks.service';
import { ViewChild } from '@angular/core';
import { User } from '../user';

@Component({
  selector: 'app-log-in-screen',
  imports: [ReactiveFormsModule, CommonModule],
  standalone: true,
  template: `
    <div class="loginInfo">
      <form [formGroup]="loginInfo" (submit)="submitInfo()">
        <label for="areaTextoUsuario">Usuario</label>
        <input type="text" placeholder="Escribe aqui tu nombre de usuario" name="Usuario" id="areaTextoUsuario" formControlName="userName">
        <label for="areaTextoPass">Contraseña</label>
        <div class="togglePass">
          <input type="password" placeholder="Escribe aqui tu contraseña" name="userPass" id="areaTextoPass" formControlName="passWord" #passwordField class="passwordField">
          <input type="checkbox" (click)="updateAreaType($event)" class="passwordCheck">
        </div>
        <input type="submit" value="Iniciar Sesión"> 
      </form>
    </div>
    
  `,
  styleUrl: './log-in-screen.component.css',
  providers: [CookieService]
})
export class LogInScreenComponent {


  private router: Router = inject(Router);
  private cookie: CookieService = inject(CookieService);
  private user: ProyectTasksService = inject(ProyectTasksService);
  @ViewChild('passwordField') passWordField!: ElementRef;


  private readonly regex: RegExp[] = [
    /(?=.*[A-Z])(?=.*[0-9]).{4,}/,
    /(?=[a-z]*[^A-Z0-9]).+/
  ]

  loginInfo: FormGroup = new FormGroup({
    userName: new FormControl<string>(''),
    passWord: new FormControl<string>(''),
  });

  constructor(){
    if(this.cookie.get('Test').valueOf() === 'ALLOWEDTOLOGIN'){
      //this.router.navigate(['/Calendar'])
    }
  }

  public updateAreaType(event: Event){
    const field = event.target as HTMLInputElement;
    if(field.checked){
      (this.passWordField.nativeElement as HTMLInputElement).type = "text";
    }else{
      (this.passWordField.nativeElement as HTMLInputElement).type = "password";
    }

  } 

  public async submitInfo(): Promise<void>{

    //this.cookie.set('Test', 'ALLOWEDTOLOGIN', 1);
    if(this.regex[1].test(this.loginInfo.value.userName) && this.regex[0].test(this.loginInfo.value.passWord)){
      let valid =  await this.user.GetUser(this.loginInfo.value.userName, this.loginInfo.value.passWord);
      if(valid){
        this.redirectToPage(valid);
      }
    }

    //this.router.navigate(['/Calendar'])
  }

  redirectToPage(user: User){
    if(user.admin){
      this.router.navigate(['/Calendar']);
    }else{
      this.router.navigate(['/Calendar']);
    }

  }


}
