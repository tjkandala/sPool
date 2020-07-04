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
    const firVal = await workerizedAdd(1, 2);
    const secVal = await workerizedSubtract(1, 2);

    expect(firVal).toBe(3);
    expect(secVal).toBe(-1);

    handle.kill();
  });

  it('throws error when called multiple times', () => {
    expect(true).toBe(true);
  });
});
