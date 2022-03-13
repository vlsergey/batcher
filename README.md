# @vlsergey/batcher

Small JavaScript module to batch async requests with queue.

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]

# Installation
```
npm i --save @vlsergey/batcher
```
or
```
npm i --save-dev @vlsergey/batcher

```

# Usage

```javascript

/* Define function that will do actual work. Not for single,
but for collection of keys. */
const batchFunction = async ( allArgs ) => {
  // allArgs is array of arrays (unless flattenArguments specified )
  const response = fetch( /*...*/ );
  if ( !response.ok ) {
    console.error( response );
    throw new Error( "Unable to fetch API result: " + response.statusText );
  }
  // return the array of result
  // length of result array MUST be the same as length of allArgs
  // order IS important
  return await response.json();
}
const batcher = new Batcher( batchFunction );
/* ... */

// Queue single call
const aPromise = batcher.queue( 'Test value' ); // is't a Promise
aPromise.then( someResultA => { /*...*/ } );

// Still single call with multiple arguments
const bPromise = batcher.queue( 'arg0', 'arg1' ); // is't a Promise
bPromise.then( someResultB => { /*...*/ } );

// Queue 2 calls with different number of arguments
const allPromises = batcher.queueAll( [ 'arg3' ], [ 'arg3', 'arg4' ] ); // Also a Promise, but obtained from Promise.all( ... ) call
allPromises.then( ( values ) => /* ... */ );

// Technically will wait, but looks nice in code in async functions
const gimmeResultNow = await batcher.queue( someRequest );
```

# API

## Constructor
```
const batcher = new Batcher( batchFunction );
const batcher = new Batcher( batchFunction, options );
```

## Options
| Option             | Default Value             | Description |
| ------------------ |:-------------------------:| :---------- |
| `delay`            | `0`                       | Delay between batch function calls. Ignored if item added to queue. |
| `flattenArguments` | `false`                   | If `true` before call all queued arguments will be flatten to single array (using `args.flatMap( a => a )` call). It is useful if Batcher is used for single-key calls. Otherwise it will create problems with multi-argument calls |
| `maxBatchSize`     | `50`                      | max size of batch for single `batchFunction` call |
| `maxQueueSize`     | `Number.MAX_SAFE_INTEGER` | Max items in queue. Error will be thrown on queue attempt if exceed. |

## Methods

`queue( arg0, arg1, ... )` -- adds single element to queue. Immediately calls `batchFunction` if not in progress.

`queueAll( [arg00, arg00], [arg10, arg11], ... )` -- adds multiple elements to queue. Immediately calls `batchFunction` if not in progress.

[npm-image]: https://img.shields.io/npm/v/@vlsergey/batcher.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@vlsergey/batcher
[downloads-image]: http://img.shields.io/npm/dm/@vlsergey/batcher.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/@vlsergey/batcher
