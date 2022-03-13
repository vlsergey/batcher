import {OptionsType} from './OptionsType';

type BatchFunctionType<Args, Value> = (args: Args[]) => Promise< Value[] >;

interface QueueItem<Args, Value> {
  args: Args;
  promise: Promise< Value >;
  reject: (reason?: unknown) => unknown;
  resolve: (value: Value) => unknown;
}

export const DEFAULT_MAX_BATCH_SIZE = 50;
export const DEFAULT_MAX_QUEUE_SIZE = Number.MAX_SAFE_INTEGER;

export const DEFAULT_OPTIONS: OptionsType = Object.freeze({
  delay: 0,
  maxBatchSize: 50,
  maxQueueSize: Number.MAX_SAFE_INTEGER,
});

function sameArgs (argsA: unknown, argsB: unknown): boolean {
  if (argsA === null || argsB === null)
    return argsA === null && argsB === null;
  if (argsA === undefined || argsB === undefined)
    return argsA === undefined && argsB === undefined;

  if (Array.isArray(argsA) && Array.isArray(argsB)) {
    if (argsA.length !== argsB.length) return false;
    for (let i = 0; i < argsA.length; i++) {
      if (!sameArgs(argsA[i], argsB[i])) return false;
    }
    return true;
  }

  return argsA == argsB;
}

/**
 * Uses single internal queue to batch all incoming queries.
 * If there is no request in progress now, any incoming request will start one.
 */
export default class Batcher<Args, Value> {

  _batchFunction: BatchFunctionType<Args, Value>;
  _options: OptionsType;

  _currentBatch: QueueItem<Args, Value>[] = [];
  _inProgress = false;
  _queue: QueueItem<Args, Value>[] = [];

  constructor (
    batchFunction: BatchFunctionType<Args, Value>,
    options: Partial<OptionsType> = DEFAULT_OPTIONS
  ) {
    this._batchFunction = batchFunction;
    this._options = {...DEFAULT_OPTIONS, ...options};
  }

  queue (args: Args): Promise< Value > {
    const alreadyQueued = this._currentBatch.find(queued => sameArgs(args, queued.args))
      || this._queue.find(queued => sameArgs(args, queued.args));
    if (alreadyQueued) {
      return alreadyQueued.promise;
    }

    if (this._queue.length == this._options.maxQueueSize) {
      throw new Error(`Queue is at max capacity (${this._options.maxQueueSize}), unable to add additional item`);
    }

    let resolve: ((value: Value) => unknown) | null = null;
    let reject: ((reason?: unknown) => unknown) | null = null;
    const promise = new Promise<Value>((pResolve, pReject) => {
      resolve = pResolve;
      reject = pReject;
    });
    this._queue.push({args, promise, resolve: resolve!, reject: reject!});

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._process();
    return promise;
  }

  queueAll (...allArgs: Args[]): Promise< Value[] > {
    if (this._queue.length + allArgs.length > this._options.maxQueueSize) {
      throw new Error(`Queue is near max capacity (${this._options.maxQueueSize}), unable to ${allArgs.length} additional items`);
    }

    const allPromises = allArgs.map((args: Args) => this.queue(args));
    const result: Promise< Value[] > = Promise.all(allPromises);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._process();
    return result;
  }

  async _process () {
    if (this._inProgress) return;

    this._inProgress = true;
    const _queueInProgress: QueueItem<Args, Value>[] = this._currentBatch
      = this._queue.splice(0, this._options.maxBatchSize);
    try {
      const batchArguments = _queueInProgress.map(({args}) => args);
      const results: Value[] = await this._batchFunction(batchArguments);

      if (results.length !== _queueInProgress.length) {
        _queueInProgress.forEach(({reject}) =>
          reject(new Error('Assertion error: Batcher function '
          + String(this._batchFunction)
          + ' result length is not the same as queue size')));
      }

      for (let i = 0; i < _queueInProgress.length; i++) {
        _queueInProgress[i]!.resolve(results[i]!);
      }
    } catch (err) {
      _queueInProgress.forEach(({reject}) => reject(err));
    } finally {
      this._inProgress = false;
      this._currentBatch = [];
    }

    if (this._queue.length > 0) {
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this._process();
      }, this._options.delay);
    }
  }

}
