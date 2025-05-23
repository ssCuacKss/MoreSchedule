export interface CPMTask {
  id: number;
  start: number;    
  dur: number;        
  preds: number[];   
  succs: number[];     
  ES?: number;
  EF?: number;
  LS?: number;
  LF?: number;
  slack?: number;
}