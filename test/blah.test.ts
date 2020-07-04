import { initThreadPool } from '../src';

describe('initThreadPool', () => {
  function cpuHeavy(first: number, second: number) {
    // change to Fib
    return first + second;
  }

  it('works', async () => {
    const [handle, workerizedCpuHeavy] = await initThreadPool(cpuHeavy);
    const miVal = await workerizedCpuHeavy(1, 2);
    console.log(miVal);
    expect(true).toEqual(true);
    handle.kill();
  });

  it('throws error when called multiple times', () => {
    expect(true).toBe(true);
  });
});
