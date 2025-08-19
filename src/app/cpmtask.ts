/**
 * ------------------------------------------------------------------------------------------------------------
 * Nombre del archivo: cmptask.ts
 * Descripción: Interfaz que representa un una tarea de un proyecto y los datos necesarios para el 
 * cálculo del camino crítico.
 * Autor: Pablo Roldan Puebla <i92ropup@uco.es>
 * Fecha de creación: 20/04/2025
 * Última modificación: 18/08/2025
 * ------------------------------------------------------------------------------------------------------------
 */


/**
 * @interface CPMTask
 * 
 * interfaz para almacenar los datos del algoritmo de camino crítico
 * 
*/

export interface CPMTask {
  /** Identificador único de la tarea*/
  id: number;
  /** minutos entre el inicio del calendario y tarea*/
  start: number;
  /** durción en minutos de la tarea*/
  dur: number;        
  /** tareas con un enlace cuyo target es esta tarea*/
  preds: number[];   
  /** tareas con un enlace cuyo source es esta tarea*/
  succs: number[];     
  /** Inicio mas temprano posible de una tarea*/
  ES?: number;
  /** Fin mas temprano posible de una tarea*/
  EF?: number;
  /** Inicio mas tardía posible de una tarea*/
  LS?: number;
  /** Fin mas tardío posible de una tarea*/
  LF?: number;
  /** Holgura de la tarea en minutos*/
  slack?: number;
}