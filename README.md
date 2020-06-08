# @vlsergey/batcher

Simple JavaScript to batch async requests.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]

# Usage

```javascript

/* Define function that will do actual work. Not for single,
but for collection of keys. */
const batchFunction /* : ( any[][] => Promise< ValueType[] > ) */ = async ( args /* : any[][] */ ) => {
  const response = fetch( /*...*/ );
  if ( !response.ok ) {
    console.error( response );
    throw new Error( "Unable to fetch API result: " + response.statusText );
  }
  return await response.json() /* : ValueType[] */;
}
const batcher = new Batcher( batchFunction );
/* ... */

// Queue single call
const aPromise /* : Promise< ValueType > */ = batcher.queue( 'Test value' );
aPromise.then( someResultA /* : ValueType */ => { /*...*/ } );

// Still single call with multiple arguments
const bPromise /* : Promise< ValueType > */ = batcher.queue( 'arg0', 'arg1' );
bPromise.then( someResultB /* : ValueType */ => { /*...*/ } );

// Queue 2 calls with different number of arguments
const allPromises /* : Promise< ValueType[] > */ =  batcher.queueAll( [ 'arg3' ], [ 'arg3', 'arg4' ] );
allPromises.then( ( values /* : ValueType[] */ ) => /* ... */ );

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
[travis-image]: https://travis-ci.org/vlsergey/batcher.svg?branch=master
[travis-url]: https://travis-ci.org/vlsergey/batcher
[downloads-image]: http://img.shields.io/npm/dm/@vlsergey/batcher.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/@vlsergey/batcher
