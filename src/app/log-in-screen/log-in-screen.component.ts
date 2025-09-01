/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: log-in-screen.component.ts
 * Descripción: Componente encargado de la vista de visualización y modificación de proyectos y plantillas en tablas gantt.
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 19/04/2025
 * Última modificación: 01/09/2025
 * ------------------------------------------------------------------------------------------------------------
 */


import { Component, ElementRef, inject, OnInit} from '@angular/core';
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
    <div class="loginInfo" >
      <!-- formaulario de datos de usuario-->
      <form [formGroup]="loginInfo">
        <img src="moreschedule.png" alt="logo moreschedule" id="logoHolder">
        <label for="areaTextoUsuario">Usuario</label>
        <input type="text" placeholder="Ejemplo: pablo (solo se admiten minusculas)" name="Usuario" id="areaTextoUsuario" formControlName="userName">
        <label for="areaTextoPass">Contraseña</label>
        <div class="togglePass">
          <input type="password" placeholder="Ejemplo: Pablo123 (minusculas, mayusculas y numeros) min: 4 caracteres " name="userPass" id="areaTextoPass" formControlName="passWord" #passwordField class="passwordField">
          <input type="checkbox" id="passwordCheckbox" class="passwordCheck">
          <label for="passwordCheckbox" id="passwordCheckImgHolder"><img id="passwordVisible" width="20" height="20" (click)="updateAreaType($event)" /></label>
        </div>
        <div class="hidden" #errorMessage></div>
        <input type="submit" value="Iniciar Sesión" (click)="submitInfo()"> 
      </form>
    </div>
    
  `,
  styleUrl: './log-in-screen.component.css',
  providers: [CookieService]
})


/** 
 * Clase encargada de inicializar y configurar la presentación y funcionalidad de la vista de login; 
 * 
 * 
 * 
*/

export class LogInScreenComponent implements OnInit{

  //servicio de enrutado de angular
  private router: Router = inject(Router);
  //servicio de cookies de angular
  private cookie: CookieService = inject(CookieService);
  //servicio de acceso a la API
  private dbDao: dbDAO = inject(dbDAO);
  //referencia al campo de contraseña 
  @ViewChild('passwordField') passWordField!: ElementRef;
  //referencia al contenedor en el que se insertará el mensaje de error 
  @ViewChild('errorMessage')  errorMessage!: ElementRef;

  //Expresiones regulares para los campos del formulario
  private readonly regex: RegExp[] = [
    /(?=.*[A-Z])(?=.*[0-9]).{4,}/,
    /^[a-z]+$/
  ]
  //formgroup que almacena la información de los campos del formulario
  loginInfo: FormGroup = new FormGroup({
    userName: new FormControl<string>(''),
    passWord: new FormControl<string>(''),
  });

  constructor(){
    
  }

  /**
   * Función asincrona que al cargar la vista comprueba si el usuario tiene permiso para iniciar sesión automáticamente en una cuenta
   * 
  */


  async ngOnInit(): Promise<void> {
    if(this.cookie.get('LoginCookie').valueOf()){
      let auth = await this.dbDao.getAuth().then(e => e);
      console.log(auth);
      if (auth.authorization) this.router.navigate(['/Calendar']);
    }
  }

  /**
   * 
   * Actualiza el tipo de area en la que se almecena la contraseña del usuario, alternar entre:
   *     1. Un area de texto.
   *     2. Un area de contraseña.
   * 
   * @param {Event} event campo HTML donde se almacena la contraseña.
   * 
   * 
  */
  public updateAreaType(event: Event){
    const field = event.target as HTMLElement;
    if(field.id === "passwordVisible"){
      (this.passWordField.nativeElement as HTMLInputElement).type = "text";
      field.id = "passwordHide";
    }else{
      (this.passWordField.nativeElement as HTMLInputElement).type = "password";
      field.id = "passwordVisible";
    }

  } 

  /**
   * 
   * Verifica el formato de las credenciales del usuario de la aplicación.
   * si tiene permiso para entrar es redirigido al calendario de la aplicación.
   * 
   * 
  */
  
  public async submitInfo(): Promise<void>{

    let error = (this.errorMessage.nativeElement) as HTMLParagraphElement;
    if(this.regex[1].test(this.loginInfo.value.userName) && this.regex[0].test(this.loginInfo.value.passWord)){
      let valid =  await this.dbDao.GetUser(this.loginInfo.value.userName, this.loginInfo.value.passWord);
      
      error.className = "hidden";
      if(valid){
        error.className = "hidden";
        this.cookie.set('LoginCookie', valid.token, 1);
        this.redirectToPage(valid.user);
      }else{
        error.innerHTML = "El usuario no existe";
        error.className = "errorMessage";
      }
    }else{
      error.innerHTML = "el usuario o contraseña no son válidos";
      error.className = "errorMessage";
    }

  }

  /**
   * 
   * Controla el acceso al calendario de la aplicación
   * 
   * @param {User} user usuario de la aplicación.
   * 
   * 
  */

  redirectToPage(user: User){
    if(user.admin){
      this.router.navigate(['/Calendar']);
    }
  }


}
