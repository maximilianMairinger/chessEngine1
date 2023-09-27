import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";
import { fullyConnectedJosmAdapter, Adapter } from "./josmAdapter.ts"

type Work = Omit<Worker, "terminate" | "onmessage" | "onmessageerror" | "onerror">

function workerToAdapter(worker: Work): Adapter {
  return {
    send(data) {
      worker.postMessage(data)
    },
    onMsg(cb, once: boolean = false) {
      const listener = (ev: MessageEvent) => {
        cb(ev.data)
      }
      worker.addEventListener("message", listener, { once })
      return () => {
        try {
          worker.removeEventListener("message", listener)
          return true
        }
        catch(e) {
          return false
        }
      }
    },
    closing: new Promise((res) => {
      worker.addEventListener("error", res as any, {once: true})
      worker.addEventListener("messageerror", res as any, {once: true})
    })
  }
}


export function fullyConnectedJosmWorkerAdapter<Dat extends Data<any> | DataBase>(worker: Work, data_dataBase: Dat, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Dat
export function fullyConnectedJosmWorkerAdapter<Dat extends Data<any> | DataBase>(worker: Work, data_dataBase: (initData: unknown) => Dat, readOnly?: boolean | Data<boolean>): Promise<Dat>
export function fullyConnectedJosmWorkerAdapter<Dat extends Data<any> | DataBase>(worker: Work, data_dataBase: Dat | ((initData: unknown) => Dat), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
  return fullyConnectedJosmAdapter(workerToAdapter(worker), data_dataBase as any, isInitiallyDominantDataSource_readOnly as any, _readOnly)
}

export function fullyConnectedJosmWorkerAdapterClient(worker: Work, readOnly: boolean | Data<boolean> = false): Promise<Data<any> | DataBase> {
  return fullyConnectedJosmWorkerAdapter(worker, (initData) => {
    return (typeof initData === "object" && initData !== null ? new DataBase(initData) : new Data(initData)) as Data | DataBase
  }, readOnly)
}
