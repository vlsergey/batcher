export interface OptionsType {

  /* Delay between batch function calls. Ignored if item added to queue. */
  delay: number;

  maxBatchSize: number;

  maxQueueSize: number;

}
