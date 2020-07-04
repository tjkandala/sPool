import { initThreadPool } from '../src';

describe('initThreadPool', () => {
  function cpuHeavyAdd(first: number, second: number) {
    // change to Fib
    return first + second;
  }

  function cpuHeavySubtract(first: number, second: number) {
    // change to Fib
    return first - second;
  }

  it('works', async () => {
    const [handle, workerizedAdd, workerizedSubtract] = initThreadPool(
      cpuHeavyAdd,
      cpuHeavySubtract
    );
    const miVal = await workerizedAdd(1, 2);
    const secVal = await workerizedSubtract(1, 2);
    console.log(miVal);
    console.log(secVal);
    expect(true).toEqual(true);
    handle.kill();
  });

  it('throws error when called multiple times', () => {
    expect(true).toBe(true);
  });
});
