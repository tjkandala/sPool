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

type AsyncWorkerStub<T extends Callback> = {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  // kill: string;
};

interface Handle {
  /** Terminates all worker threads */
  kill: () => void;
  log: () => void;
}

/** module global variable to prevent creation of multiple thread pools */
let alreadyPooled = false;

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

  alreadyPooled = true;

  // this is a 2-core/4-thread processor, cpus().length is returning 4
  // seems it is accounting for hyperthreading
  // might make threads configurable (default to available threads if first arg is falsy)
  const threads = cpus().length;

  const idleWorkers: Worker[] = [];
  const activeWorkers: Worker[] = [];

  // create string of array of fns
  let fnsString = '[';
  for (let i = 0; i < funcs.length; i++) {
    fnsString += funcs[i].toString();
    fnsString += ', ';
  }
  fnsString += ']';

  const workerScript = `
    const {parentPort} = require("worker_threads");

    const fns = ${fnsString}
    fns[0]()
  
    parentPort.on("message", (val) => {
        switch(val.type) {
            case "call": {
                const data = fns[val.fnIndex](...val.args);
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

  type Resolve = (value?: any) => void;
  type Task = [number, any, Resolve];

  const invocationQueue: Task[] = [];

  /**
   *
   * @param task [index of function, args]
   */
  function queueTask(task: Task) {
    invocationQueue.push(task);
    if (idleWorkers.length > 0) {
      threadAvailable();
    }
  }

  function threadAvailable() {
    while (invocationQueue.length > 0 && idleWorkers.length > 0) {
      executeTask();
    }
  }

  function executeTask() {
    const task = invocationQueue.shift();
    if (task) {
      const thisWorker = idleWorkers.shift();
      if (thisWorker) {
        activeWorkers.push(thisWorker);
        thisWorker.postMessage({
          type: 'call',
          fnIndex: task[0],
          args: task[1],
        });

        function cleanup(val: any) {
          // resolve promise
          task && task[2](val);
          if (thisWorker) {
            thisWorker?.off('message', cleanup);
            // move thread, call threadAvailable
            handle.log();
            activeWorkers.splice(activeWorkers.indexOf(thisWorker), 1);
            idleWorkers.push(thisWorker);
            handle.log();
            threadAvailable();
          }
        }

        thisWorker.on('message', cleanup);
      }
    }
  }

  const handle: Handle = {
    kill() {
      while (idleWorkers.length) {
        idleWorkers.pop()?.terminate();
      }
      while (activeWorkers.length) {
        activeWorkers.pop()?.terminate;
      }
      // allow the user to create another thread pool now
      alreadyPooled = false;
    },
    log() {
      console.dir({
        idleWorkers,
        activeWorkers,
        invocationQueue,
      });
    },
  };

  return [
    handle,
    ...funcs.map((cb, i) => {
      /**
       * 'client stub' of passed in function.
       *
       * on invocation:
       * 1) add a tuple of function index and args to invocation queue
       * 2)
       * 3)
       */
      return function workerized(
        ...args: Parameters<typeof cb>
      ): Promise<ReturnType<typeof cb>> {
        // you may not ACTUALLY have a worker available here at this time...
        // so I must use a different communication channel to send return value
        // IDEA: send resolve fn to task queue.

        return new Promise<ReturnType<typeof cb>>(res => {
          queueTask([i, args, res]);
        });
      };
    }),
  ];
}
