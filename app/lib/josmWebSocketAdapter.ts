import { stringify, parse } from "circ-json"
import { Data, DataBase, instanceTypeSym, DataBaseSubscription, DataSubscription } from "josm";
import { WebSocket as NodeWebSocket } from "ws";
import { fullyConnectedJosmAdapter, Adapter } from "./josmAdapter"

function wsToAdapter(ws: WebSocket): Adapter {
  return {
    send(data) {
      ws.send(stringify(data))
    },
    onMsg(cb, once: boolean = false) {
      const listener = (ev: MessageEvent) => {
        if (ws.readyState !== WebSocket.OPEN) return
        cb(parse(ev.data))
      }
      ws.addEventListener("message", listener, { once })
      return () => {
        try {
          ws.removeEventListener("message", listener)
          return true
        }
        catch(e) {
          return false
        }
      }
    },
    closing: new Promise((res) => {
      ws.addEventListener("closing", res as any, {once: true})
      ws.addEventListener("close", res as any, {once: true})
    })
  }
}

type Ws = WebSocket | NodeWebSocket

export function fullyConnectedJosmWebSocketAdapter<Dat extends Data<any> | DataBase>(ws: Ws, data_dataBase: Dat, isInitiallyDominantDataSource: boolean, readOnly?: boolean | Data<boolean>): Promise<Dat>
export function fullyConnectedJosmWebSocketAdapter<Dat extends Data<any> | DataBase>(ws: Ws, data_dataBase: (initData: unknown) => Dat, readOnly?: boolean | Data<boolean>): Promise<Dat>
export async function fullyConnectedJosmWebSocketAdapter<Dat extends Data<any> | DataBase>(ws: Ws, data_dataBase: Dat | ((initData: unknown) => Dat), isInitiallyDominantDataSource_readOnly?: boolean | Data<boolean>, _readOnly?: boolean | Data<boolean>) {
  const promTillWsOpen = new Promise<Ws>((res, rej) => {
    if (ws.readyState === ws.OPEN) res(ws)
    // else if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) rej("ws is closed")
    else (ws as WebSocket).addEventListener("open", res as any)
  })
  const promAdapter = promTillWsOpen.then(() => wsToAdapter(ws as WebSocket))

  return fullyConnectedJosmAdapter(await promAdapter, data_dataBase as any, isInitiallyDominantDataSource_readOnly as any, _readOnly)
}

export function fullyConnectedJosmWebSocketAdapterClient(ws: WebSocket, readOnly: boolean | Data<boolean> = false): Promise<Data<any> | DataBase> {
  return fullyConnectedJosmWebSocketAdapter(ws, (initData) => {
    return (typeof initData === "object" && initData !== null ? new DataBase(initData) : new Data(initData)) as Data | DataBase
  }, readOnly)
}
