// @flow

import type { OptionsType } from './OptionsType';

type ArgsType = any[];
type ValueType = any;

type BatchFunctionType = any[] => Promise< ValueType[] >;
type QueueItem = { args : ArgsType, reject : any, resolve : ValueType => any };

export const DEFAULT_MAX_BATCH_SIZE : number = 50;
export const DEFAULT_MAX_QUEUE_SIZE : number = Number.MAX_SAFE_INTEGER;

export const DEFAULT_OPTIONS : OptionsType = Object.freeze( {
  delay: 0,
  flattenArguments: false,
  maxBatchSize: 50,
  maxQueueSize: Number.MAX_SAFE_INTEGER,
} );

/**
 * Uses single internal queue to batch all incoming queries.
 * If there is no request in progress now, any incoming request will start one.
 */
export default class Batcher {

  _batchFunction : BatchFunctionType;
  _options : OptionsType;

  _inProgress : boolean = false;
  _queue : QueueItem[] = [];

  constructor(
    batchFunction : BatchFunctionType,
    options : $Shape< OptionsType > = DEFAULT_OPTIONS
  ) {
    this._batchFunction = batchFunction;
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  queue( ...args : ArgsType ) : Promise< ValueType > {
    if ( this._queue.length == this._options.maxQueueSize ) {
      throw new Error( `Queue is at max capacity (${this._options.maxQueueSize}), unable to add additional item` );
    }
    const result = new Promise( ( resolve, reject ) => {
      const queueItem : QueueItem = { args, resolve, reject };
      this._queue.push( queueItem );
    } );
    this._process();
    return result;
  }

  queueAll( ...allArgs : ArgsType[] ) : Promise< ValueType[] > {
    if ( this._queue.length + allArgs.length > this._options.maxQueueSize ) {
      throw new Error( `Queue is near max capacity (${this._options.maxQueueSize}), unable to ${allArgs.length} additional items` );
    }

    const allPromises = allArgs.map( ( args : ArgsType ) => new Promise( ( resolve, reject ) => {
      this._queue.push( { args, resolve, reject } );
    } ) );
    const result : Promise< ValueType[] > = Promise.all( allPromises );
    this._process();
    return result;
  }

  async _process() {
    if ( this._inProgress ) return;

    this._inProgress = true;
    const _queueInProgress : QueueItem[] = this._queue.splice( 0, this._options.maxBatchSize );
    try {
      const batchArguments : any[][] = _queueInProgress.map( ( { args } : QueueItem ) => args );
      let results : ValueType[];
      if ( this._options.flattenArguments ) {
        const actualArguments : any[] = batchArguments.flatMap( args => args );
        results = await this._batchFunction( actualArguments );
      } else {
        results = await this._batchFunction( batchArguments );
      }

      if ( results.length !== _queueInProgress.length ) {
        _queueInProgress.forEach( ( { reject } ) =>
          reject( new Error( 'Assertion error: Batcher function '
          + String( this._batchFunction )
          + ' result length is not the same as queue size' ) ) );
      }

      for ( let i = 0; i < _queueInProgress.length; i++ ) {
        _queueInProgress[ i ].resolve( results[ i ] );
      }
    } catch ( err ) {
      _queueInProgress.forEach( ( { reject } ) => reject( err ) );
    } finally {
      this._inProgress = false;
    }

    if ( this._queue.length > 0 ) {
      setTimeout( () => this._process(), this._options.delay );
    }
  }

}
