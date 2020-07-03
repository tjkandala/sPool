import { Worker } from 'worker_threads';
import { cpus } from 'os';

/*
 * sPool library: Easy Type-Safe Worker Thread Pools
 *
 *
 * TODOs:
 * - make it isomorphic! (compat w Web Workers & Node.js Workers)? optional
 * - benchmark against single-threaded impls
 * - error handling (check stack trace)
 * - abortable
 * - use SharedArrayBuffer!
 * - finally, demonstrate a real-world use-case! (load testing?????)
 * - solve dining philosophers problem in sPool! the only node solution I found uses clusters, not workers!
 *
 * NOTEs:
 * - don't make an overloaded main function! separate api for function and for files... wait nvm. might be more elegant to overload
 * - cool perks! no syncronization needed bc no shared address space/memory
 *
 * final steps: read all of mraleph, optimize perf
 *
 * Tradeoffs:
 * - duplicating function definitions in all threads
 * - can't reference enclosing scopes in functions
 * - have to pass in functions at creation time
 *
 * References:
 * https://www.ibm.com/developerworks/java/library/j-jtp0730/index.html
 *
 * Why?
 *  - I was a little exhausted from constantly code-golfing for front-end libraries. On Node.js libraries,
 *    I can focus on API design and runtime performance, without bundle size getting in the way. no worries
 * about RegeneratorRuntime
 */

type Callback = (...args: any) => any;

let alreadyPooled = false;

type AsyncWorkerStub<T extends Callback> = {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  // kill: string;
};

interface Handle {
  /** Terminates all worker threads */
  kill: () => void;
  log: () => void;
}

// mapped tuple types didn't really work out
export async function initThreadPool<T extends [Callback]>(
  ...funcs: T
): Promise<[Handle, AsyncWorkerStub<T[0]>]>;
export async function initThreadPool<T extends [Callback, Callback]>(
  ...funcs: T
): Promise<[Handle, AsyncWorkerStub<T[0]>, AsyncWorkerStub<T[1]>]>;
export async function initThreadPool<T extends [Callback, Callback, Callback]>(
  ...funcs: T
): Promise<
  [Handle, AsyncWorkerStub<T[0]>, AsyncWorkerStub<T[1]>, AsyncWorkerStub<T[2]>]
>;
export async function initThreadPool<
  T extends [Callback, Callback, Callback, Callback]
>(
  ...funcs: T
): Promise<
  [
    Handle,
    AsyncWorkerStub<T[0]>,
    AsyncWorkerStub<T[1]>,
    AsyncWorkerStub<T[2]>,
    AsyncWorkerStub<T[3]>
  ]
>;
export async function initThreadPool<
  T extends [Callback, Callback, Callback, Callback, Callback]
>(
  ...funcs: T
): Promise<
  [
    Handle,
    AsyncWorkerStub<T[0]>,
    AsyncWorkerStub<T[1]>,
    AsyncWorkerStub<T[2]>,
    AsyncWorkerStub<T[3]>,
    AsyncWorkerStub<T[4]>
  ]
>;
export async function initThreadPool<
  T extends [Callback, Callback, Callback, Callback, Callback, Callback]
>(
  ...funcs: T
): Promise<
  [
    Handle,
    AsyncWorkerStub<T[0]>,
    AsyncWorkerStub<T[1]>,
    AsyncWorkerStub<T[2]>,
    AsyncWorkerStub<T[3]>,
    AsyncWorkerStub<T[4]>,
    AsyncWorkerStub<T[5]>
  ]
>;
export async function initThreadPool<T extends [...Callback[]]>(...funcs: T) {
  if (alreadyPooled) {
    const err = new Error('A thread pool already exists!');
    err.name = 'MultipleThreadPoolError';
    throw err;
  }

  if (funcs.length == 0) {
    const err = new Error('Thread pool has no functions');
    err.name = 'InvalidThreadPoolError';
    throw err;
  }

  // module global variable to prevent creation of multiple thread pools
  alreadyPooled = true;

  // this is a 2-core/4-thread processor, cpus().length is returning 4
  // seems it is accounting for hyperthreading
  const threads = cpus().length;

  const idleWorkers: Worker[] = [];
  const activeWorkers: Worker[] = [];

  // create string of array of fns
  const funcString = funcs[0].toString();

  let fnsString = '[';
  for (let i = 0; i < funcs.length; i++) {
    fnsString += funcs[i].toString();
    fnsString += ',';
  }
  fnsString += ']';

  console.log(fnsString);

  const workerScript = `
    const {parentPort} = require("worker_threads");

    ${funcString}

    const fns = ${fnsString}
    fns[0]()
  
    parentPort.on("message", (val) => {
        switch(val.type) {
            case "call": {
                const data = ${funcs[0].name}(...val.args);
                parentPort?.postMessage({ status: "received", data });
                break;
            }

            case "replaceFunc": {
                console.log("repl")
                break;
            }
        }
    });
    `;

  for (let i = 0; i < threads; i++) {
    idleWorkers.push(
      new Worker(workerScript, {
        eval: true,
      })
    );
  }

  const invocationQueue: any[] = [];

  const handle: Handle = {
    kill() {
      for (let i = 0; i < idleWorkers.length; i++) {
        idleWorkers[i].terminate();
      }
      for (let i = 0; i < activeWorkers.length; i++) {
        activeWorkers[i].terminate();
      }
    },
    log() {},
  };

  return [
    handle,
    ...funcs.map(cb => {
      /**
       * 'client stub' of passed in function.
       *
       * on invocation:
       * 1)
       * 2)
       * 3)
       */
      return function workerized(
        ...args: Parameters<typeof cb>
      ): Promise<ReturnType<typeof cb>> {
        const myWorker = idleWorkers[0];
        myWorker.postMessage({
          type: 'replaceFunc',
        });

        invocationQueue.push(['func0', args]);
        console.log(invocationQueue);

        myWorker.postMessage({
          type: 'call',
          args,
        });

        return new Promise<ReturnType<typeof cb>>(res => {
          console.log(args);
          res();
        });
      };
    }),
  ];
}

/**
 * TODO
 */
// class Queue<T> {}

function one(cat: string) {
  return 'hi ' + cat;
}

function two() {
  return 22;
}

async function main() {
  // TODO: find the types that make this work
  const [handle, first, second, third] = await initThreadPool(one, two, one);

  first('tj');
  second();
  third('tj');

  handle.kill();
}

main();
