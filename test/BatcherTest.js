// @flow

import assert from 'assert';
import Batcher from '../src';

function sleep( time : number ) : Promise< void > {
  return new Promise<void>( resolve => setTimeout( resolve, time ) );
}

describe( 'Batcher', () => {

  it( 'works', async() => {
    let lastCompleted = '';
    const worker = async( items : string[][] ) => {
      await sleep( 0 );
      lastCompleted = items.join( ',' );
      return items.map( i => '+' + i.join( ',' ) + '+' );
    };
    const batcher : Batcher = new Batcher( worker );

    const aPromise = batcher.queue( 'A' );
    assert.equal( lastCompleted, '' );

    await sleep( 0 );
    assert.equal( lastCompleted, 'A' );

    const aResult = await aPromise;
    assert.equal( aResult, '+A+' );
  } );

  it( 'works with flattenArguments=true', async() => {
    let lastCompleted = '';
    const worker = async( items : string[] ) => {
      await sleep( 0 );
      lastCompleted = items.join( ',' );
      return items.map( ( i : string ) => '+' + i + '+' );
    };
    const batcher : Batcher = new Batcher( worker, { flattenArguments: true } );

    const aPromise = batcher.queue( 'A' );
    assert.equal( lastCompleted, '' );

    await sleep( 0 );
    assert.equal( lastCompleted, 'A' );

    const aResult = await aPromise;
    assert.equal( aResult, '+A+' );
  } );

  it( 'correctly works with small maxBatchSize', async() => {
    const queried : string[] = [];
    const worker = async( allArgs : any[][] ) => {
      await sleep( 0 );
      queried.push( allArgs.join( ',' ) );
      return allArgs.map( i => '+' + i.join( ',' ) + '+' );
    };
    const batcher : Batcher = new Batcher( worker, { maxBatchSize: 3 } );

    batcher.queue( 'A' );
    // not started yet
    assert.deepEqual( queried, [] );

    const bPromise = batcher.queueAll( [ 'B' ], [ 'C' ], [ 'D' ], [ 'E' ], [ 'F' ] );
    // not started yet
    assert.deepEqual( queried, [] );

    await bPromise;
    // first of all we scheduled 1 item immediatly
    // after that all incoming will be split in group of 3
    assert.deepEqual( queried, [ 'A', 'B,C,D', 'E,F' ] );
  } );

  it( 'correctly handle duplicates', async() => {
    let counter = 0;
    const queried : string[] = [];
    const worker = async( allArgs : any[][] ) => {
      await sleep( 0 );
      queried.push( allArgs.join( ',' ) );
      return allArgs.map( i => i.join( ',' ) + '/' + ( counter++ ) );
    };
    const batcher : Batcher = new Batcher( worker );

    const p1 = batcher.queue( 'A' );
    const p2 = batcher.queue( 'B' );
    const p3 = batcher.queue( 'A' );

    const r1 = await p1;
    const r2 = await p2;
    const r3 = await p3;

    assert.equal( r1, r3 );
    assert.notEqual( r1, r2 );
    assert.notEqual( r2, r3 );
  } );

} );
