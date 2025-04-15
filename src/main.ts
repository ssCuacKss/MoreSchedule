import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { platformBrowser } from '@angular/platform-browser';
import { GanttEditorModule } from './app/gantt-editor/gantt-editor.module';
import routeConfig from './app/routes';

//bootstrapApplication(AppComponent, appConfig)
//  .catch((err) => console.error(err));

  platformBrowser()
  .bootstrapModule(GanttEditorModule)
  .catch(err => console.error(err));