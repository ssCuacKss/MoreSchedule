# MoreSchedule

Repositorio del código fuente del trabajo fin de grado para el grado de ingeniería informática en la Universidad de Córdoba.

El proyecto listo para despliegue como aplicación web se puede descargar desde [ este enlace](https://github.com/ssCuacKss/MoreSchedule/releases/tag/AngularBuildApplicatoin). La instalación puede realizarse según aparece en el manual de usuario.

Para una instalación para pruebas y desarrollo se deben seguir los pasos en la sección de **Instalación para desarrollo**


## Documentación

Todos los ficheros con código relevante sobre el proyecto han sido documentados, tanto clarificación de flujos mas complejos como documentación de funciones desarrolladas para el funcionamiento del sistema. Los ficheros del cliente que se encuentran documentados están bajo el directorio `source/app`, en el lado del servidor, bajo el directorio `server`. 
Así mismo toda la documentación relevante al diseño del sistema y guías generales de uso e instalación para entorno de producción se encuentran en el directorio `TFG`.

En el cliente en concreto se encuentran documentados:

- log-in-screen/log-in-screen.component.ts: Documentación sobre la vista inicio de sesión y lógica de generación de cookies y credenciales de acceso de usuarios.
- schedule-calendar/schedule-calendar.component.ts: Documentación sobre la vista de calendario global de proyectos, lógica para configuración del comportamiento del sistema, y gestión de usuarios, plantillas de proyectos y proyectos.
- schedule-chart/schedule-chart.component.js: Documentación sobre la vista de tabla gantt, configuración de la vista según elemento accedido, lógica de actualización de proyectos.
- directorio DTO: Documentación de todos los objetos de datos que sirven de interfaz entre la información presentada al cliente y los datos recuperados de la base de datos por el servidor.
- cpmtask.ts: Documentación relativa al objeto que almacena el calculo del camino crítico para tareas de la tabla Gantt de un proyecto.
- dbDAO.ts: Documentación relativa al servicio de acceso y recuperación de información que accede a la API RESTful expuesta por el servidor de la aplicación (backend).
- app.component.ts: Documentación relativa al componente raiz de la aplicación, enrutado interno de las vistas de la SPA. 
- routes.ts: Documentación relativa a la definición de las rutas de acceso a los componentes de la SPA (y sus vistas por tanto) mediante URI.
- index.html: Documentación relativa al fichero raiz de la aplicación web en el que se insertará el código dinámico de la aplicación.

En el servidor por otro lado el único fichero documentado es `server.js`, donde la documentación explica el resultado de cada punto final de la API RESTful, además de las operaciones periódicas y utilidades que realiza el servidor.




## Instalación para desarrollo

Se debe instalar el entorno NodeJS e instalar las dependencias requeridas por el proyecto (entradas en *package.json*), para instalar el entorno node en tu equipo, puedes obtenerlo desde el [enlace de descarga oficial](https://nodejs.org/es/download). En equipos Linux se puede optar alternativamente por buscar la disponibilidad del software en el gestor de paquetes del que disponga la distribución e instalar desde ahí.

Con el entorno establecido se debe descargar el framework angular mediante el gestor de paquetes de NodeJS (npm), se puede usar el siguiente comando en la interfaz de linea de comandos: 

```
npm install -g @angular/cli@19.2.6
```

con esto queda instalado el framework angular en su versión 19.2.6, podemos clonar el proyecto desde el repositorio o descargarlo, una vez hecho accedemos al directorio del proyecto  en la terminal y ejecutamos

```
npm install
```

con lo que se instalan todas las dependencias del proyecto.

Si todo ha salido bien se puede ejecutar

```
node server/server.js

ng serve -o
```

con esto ejecutamos el servidor (backend) de la aplicación e iniciamos el servidor de aplicaciones privado para desarrollo de angular, alojando la aplicación en la dirección `localhost:4200`.

En caso de fallo en alguno de estos puntos el error será mostrado por consola, habitualmente debido a descarga de un paquete en una versión no soportada por la aplicación, para solucionarlo elimina el paquete conflictivo e instala la ultima versión soportada del paquete.

si se desea construir el proyecto para su despliegue en el entorno de producción se debe ejecutar: 

```
ng build --configuracion=production
```
**¡Importante!** usar el parámetro --base-href=/\<dirname\>/ ( sustituyendo \<dirname\> por el subdirectorio en el que se alojará la aplicacación web) si se pretende acceder a la aplicación web dentro de un directorio diferente al directorio raiz establecido por el servidor de ficheros elegido.