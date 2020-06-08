// @flow

export type OptionsType = {

  /* Delay between batch function calls. Ignored if item added to queue. */
  delay : number,

  /* Do we need to pass all arguments as single array, intead of array of arrays? */
  flattenArguments : boolean,

  maxBatchSize : number,

  maxQueueSize : number,

};
