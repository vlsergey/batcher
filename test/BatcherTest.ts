import {assert} from 'chai';

import Batcher from '../src';

function sleep (time: number): Promise< void > {
  return new Promise<void>(resolve => setTimeout(resolve, time));
}

describe('Batcher', () => {

  it('works', async () => {
    let lastCompleted = '';
    const worker = async (items: string[]) => {
      await sleep(0);
      lastCompleted = items.join(',');
      return items.map(i => i);
    };
    const batcher = new Batcher(worker);

    const aPromise = batcher.queue('A');
    assert.equal(lastCompleted, '');

    await sleep(0);
    assert.equal(lastCompleted, 'A');

    const aResult = await aPromise;
    assert.equal(aResult, 'A');
  });

  it('works with arrays as type of batch argument', async () => {
    const worker = async (items: string[][]) => {
      await sleep(0);
      return items.map(i => i.join(','));
    };
    const batcher = new Batcher(worker);

    const aPromise = batcher.queue(['1']);
    const bPromises = batcher.queueAll([], ['2'], ['3', '4']);

    await sleep(0);

    assert.deepEqual(await aPromise, '1');
    assert.deepEqual(await bPromises, ['', '2', '3,4']);
  });

  it('correctly works with small maxBatchSize', async () => {
    const queried: string[] = [];
    const worker = async (allArgs: string[]) => {
      await sleep(0);
      queried.push(allArgs.join(','));
      return allArgs.map(i => '+' + i + '+');
    };
    const batcher = new Batcher(worker, {maxBatchSize: 3});

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    batcher.queue('A');
    // not started yet
    assert.deepEqual(queried, []);

    const bPromise = batcher.queueAll('B', 'C', 'D', 'E', 'F');
    // not started yet
    assert.deepEqual(queried, []);

    await bPromise;
    // first of all we scheduled 1 item immediatly
    // after that all incoming will be split in group of 3
    assert.deepEqual(queried, ['A', 'B,C,D', 'E,F']);
  });

  it('correctly handle duplicates', async () => {
    let counter = 0;
    const queried: string[] = [];
    const worker = async (allArgs: string[]) => {
      await sleep(0);
      queried.push(allArgs.join(','));
      return allArgs.map(i => `${i}/${counter++}`);
    };
    const batcher = new Batcher(worker);

    const p1 = batcher.queue('A');
    const p2 = batcher.queue('B');
    const p3 = batcher.queue('A');

    const r1 = await p1;
    const r2 = await p2;
    const r3 = await p3;

    assert.equal(r1, r3);
    assert.notEqual(r1, r2);
    assert.notEqual(r2, r3);
  });

});
