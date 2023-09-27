import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";


// export type WebSocketUrl = string | URL 

type UnsubscribeSuccessful = boolean
type UnsubscribeFunc = () => UnsubscribeSuccessful
export type Adapter<Data = unknown> = {
  // cb should be called with the data received parsed to a usable object/primitive (so JSON.parse if you use json), so with the (potential) transition done in send already undone. If once is true, cb should be called only once. Default is false
  onMsg(cb: (data: Data) => void, once?: boolean): UnsubscribeFunc
  send(data: Data): void
  closing: Promise<void>
}

type UnifiedDataAndBase = (cb: (data: any) => void, init?: boolean) => (DataSubscription<[unknown]> | DataBaseSubscription<[unknown]>)

export function unifyDataAndDataBase(data_dataBase: Data<any> | DataBase): UnifiedDataAndBase {
  if (data_dataBase[instanceTypeSym] === "Data") {
    const data = data_dataBase as Data<any>
    return (cb: (data: any) => void, init?: boolean) => {
      return data.get(cb, init)
    }
  }
  else {
    const dataBase = data_dataBase as DataBase
    return (cb: (data: any) => void, init?: boolean) => {
      return dataBase((fullData, diffData) => {
        cb(diffData)
      }, true, init) as any as DataBaseSubscription<[unknown]>
    }
  }
}


export function fullyConnectedJosmAdapter<Dat extends Data<any> | DataBase>(adapter: Adapter, data_dataBase: Dat, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Dat
export function fullyConnectedJosmAdapter<Dat extends Data<any> | DataBase>(adapter: Adapter, data_dataBase: (initData: unknown) => Dat, readOnly?: boolean | Data<boolean>): Promise<Dat>
export function fullyConnectedJosmAdapter<Dat extends Data<any> | DataBase>(adapter: Adapter, data_dataBase: Dat | ((initData: unknown) => Dat), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
  const isFunc = data_dataBase instanceof Function && data_dataBase[instanceTypeSym] !== "DataBase"
  const isInitiallyDominantDataSource: boolean = isFunc ? false : isInitiallyDominantDataSource_readOnly as boolean ?? true
  const readOnly: boolean | Data<boolean> = (isFunc ? isInitiallyDominantDataSource_readOnly ?? false : _readOnly ?? isInitiallyDominantDataSource) as boolean | Data<boolean>
  const readOnlyData = typeof readOnly !== "boolean" ? readOnly : new Data(readOnly)

  const sendFunc = (data: any) => {
    adapter.send(data)
  }

  const run = (getData: UnifiedDataAndBase) => {
    const listener = getData(sendFunc, isInitiallyDominantDataSource)

    const setToData = (data: any) => {
      listener.setToData(data)
    }
    let unsubscribeFromCurrentListener: UnsubscribeFunc = () => false
    readOnlyData.get((readOnly) => {
      if (!readOnly) {
        unsubscribeFromCurrentListener = adapter.onMsg(setToData)
      }
      else {
        unsubscribeFromCurrentListener()
      }
    })
    
    adapter.closing.then(() => {
      listener.deactivate()
    })
  }

  if (isFunc) {
    return new Promise((res) => {
      const unsub = adapter.onMsg((data) => {
        unsub()
        const db = data_dataBase(data) as Data<any> | DataBase
        run(unifyDataAndDataBase(db))
        res(db)
      })
    })
  }
  else {
    run(unifyDataAndDataBase(data_dataBase as Data | DataBase))
    return data_dataBase
  }
}

export default fullyConnectedJosmAdapter