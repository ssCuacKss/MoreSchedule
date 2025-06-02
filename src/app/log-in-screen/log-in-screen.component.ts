import { Component, ElementRef, inject} from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { dbDAO } from '../dbDAO';
import { ViewChild } from '@angular/core';
import { User } from '../DTO/user';

@Component({
  selector: 'app-log-in-screen',
  imports: [ReactiveFormsModule, CommonModule],
  standalone: true,
  template: `
    <div class="loginInfo">
      <form [formGroup]="loginInfo">
        <label for="areaTextoUsuario">Usuario</label>
        <input type="text" placeholder="Ejemplo: pablo (solo se admiten minusculas)" name="Usuario" id="areaTextoUsuario" formControlName="userName">
        <label for="areaTextoPass">Contraseña</label>
        <div class="togglePass">
          <input type="password" placeholder="Ejemplo: Pablo123 (minusculas, mayusculas y numeros) min: 4 caracteres " name="userPass" id="areaTextoPass" formControlName="passWord" #passwordField class="passwordField">
          <input type="checkbox" (click)="updateAreaType($event)" class="passwordCheck">
        </div>
        <div class="hidden" #errorMessage></div>
        <input type="submit" value="Iniciar Sesión" (click)="submitInfo()"> 
      </form>
    </div>
    
  `,
  styleUrl: './log-in-screen.component.css',
  providers: [CookieService]
})
export class LogInScreenComponent {


  private router: Router = inject(Router);
  private cookie: CookieService = inject(CookieService);
  private user: dbDAO = inject(dbDAO);
  @ViewChild('passwordField') passWordField!: ElementRef;
  @ViewChild('errorMessage')  errorMessage!: ElementRef;

  private readonly regex: RegExp[] = [
    /(?=.*[A-Z])(?=.*[0-9]).{4,}/,
    /(?=.[a-z]*)(?=.*[^A-Z]).+/
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
    let error = (this.errorMessage.nativeElement) as HTMLParagraphElement;
    if(this.regex[1].test(this.loginInfo.value.userName) && this.regex[0].test(this.loginInfo.value.passWord)){
      let valid =  await this.user.GetUser(this.loginInfo.value.userName, this.loginInfo.value.passWord);
      error.className = "hidden";
      if(valid){
        error.className = "hidden";
        this.redirectToPage(valid);
      }else{
        error.innerHTML = "El usuario no existe";
        error.className = "errorMessage";
      }
    }else{
      error.innerHTML = "el usuario o contraseña no son válidos";
      error.className = "errorMessage";
    }

    //this.router.navigate(['/Calendar'])
  }


  redirectToPage(user: User){
    if(user.admin){
      this.router.navigate(['/Calendar']);
    }
  }


}
