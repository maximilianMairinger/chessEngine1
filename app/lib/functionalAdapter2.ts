import clone from "circ-clone"
import { Adapter } from "./josmAdapter"
import sani, { OBJECT, OR, NOT, AND, AWAITED, unknown, any } from "sanitize-against"
export { polyfill } from "sanitize-against"
import keyIndex from "key-index"



// export type WsOnFunc = (eventType: "open" | "close" | "message" | "error", cb: (data: any) => void) => void  
// export type WsSendFunc = (data: any) => void
// export type WebSocket = {on: WsOnFunc, send: WsSendFunc}
// export type WsAttachment = { ws: ((path: string, cb: (ws: {on: WsOnFunc, send: WsSendFunc}) => void) => void) }




const asPromise = async (a: unknown) => await a



function incUIDScope() {
  let uid = 0
  return () => {
    return "" + uid++
  }
}

function pluck(ob: any, dotJoinedPath: string) {
  const path = dotJoinedPath.split(".")
  let cur = ob
  for (const key of path) {
    if (!Object.hasOwn(cur, key)) throw new Error("Path " + dotJoinedPath + " not found")
    cur = cur[key]
  }
  return cur
}


export function simpleFunctionBasedClient(ad: Adapter) {
  return mkRecursiveFuncProxy((f, a) => {
    ad.send({f, a})
  })
}


type FunctionTable = {[key in string]: ((...a: any[]) => unknown) | FunctionTable}
export function simpleFunctionBasedServer(a: Pick<Adapter, "onMsg">, functionTable: FunctionTable) {
  a.onMsg(({f, a}: {f: string, a: any[]}) => {
    try {pluck(functionTable, f)(...a)}
    catch(e) {console.error(e)}
  })
}






function cryptUIDScope() {
  // todo
  console.warn("todo uid crypt")
  return incUIDScope()
}






const nestedObPrimitiveFilter = sani(new OBJECT(new OR(String, Number, Boolean), true, true))
const saniFunction = sani(Function)

export function functionBasedServer<FunctionMap extends {[key in string]: (...a: any[]) => unknown}>(a: Adapter, functionTable: FunctionMap) {
  const fbsIndex = {}
  simpleFunctionBasedServer(a, fbsIndex)

  const client = simpleFunctionBasedClient(a)
  const nonFunctionalFunctionTable = nestedObPrimitiveFilter(functionTable)
  client.setStatic(nonFunctionalFunctionTable)

  const getUIDCrypt = cryptUIDScope()
  function functionBasedServerRec<FunctionMap extends {[key in string]: (...a: any[]) => unknown}>(a: Adapter, functionTable: FunctionMap | Function, scope: string) {
    fbsIndex[scope] = {
      async callFunction({name, returnId, args}: {name: string | null, returnId: number, args: unknown[]}) {
        try {
          const res = await (name === null ? saniFunction(functionTable as Function) : pluck(functionTable, name))(...args)

          if ((typeof res === "object" && res !== null) || res instanceof Object) {
            const uid = getUIDCrypt()
            functionBasedServerRec(a, res as any, uid)
            let parsedRes: unknown
            try {parsedRes = nestedObPrimitiveFilter(res)}
            catch(e) {}
            client.sendReturn({name: returnId, res: parsedRes, uid})
          }
          else {
            client.sendReturn({name: returnId, res})
          }
          
        }
        catch(e) {
          client.sendReturn({name: returnId, rej: e.message})
        }
      }
    }
  }

  functionBasedServerRec(a, functionTable, "")
}

const saniUID = sani(String)
export function functionBasedClient(a: Adapter) {
  const server = simpleFunctionBasedClient(a)

  const callback = {
    getUID: incUIDScope(),
    table: new Map<string, {res: (a: {uid?: string, res: unknown}) => void, rej: (reason: unknown) => void}>()
  }


  function constrLocalRecFuncProx(p: {uid?: string, res: unknown} | Promise<{uid?: string, res: unknown}>) {
    return mkRecursiveFuncProxy((name, args) => {
      const returnId = callback.getUID()

      const nextProm = new Promise<{uid?: string, res: unknown}>((res, rej) => {
        callback.table.set(returnId, {res, rej})
      });
      
      (async () => {
        server[saniUID((await p).uid)].callFunction({name, args, returnId})
      })()
      
      return constrLocalRecFuncProx(nextProm)
    }, asPromise(p).then(({res}) => res as unknown))
  }

  

  const staticOb = new Promise<object>((res) => {
    simpleFunctionBasedServer(a, {
      sendReturn(arg: {name: string, res: unknown, uid?: string} | {name: string, rej: string}) {
        const { name } = arg
        const prom = callback.table.get(name)
        if (prom !== undefined) {
          if ("res" in arg) {
            prom.res(saniResUid(arg as {uid?: string, res: unknown}))
          }
          else prom.rej(arg.rej)
          callback.table.delete(name)
        }
        else console.warn(`Got answer for unknown request ${name}`)
      },
      setStatic(ob: object) {
        res(ob)
      }
    })
  })



  return constrLocalRecFuncProx({uid: "", res: staticOb})
}
const saniResUid = sani({"uid?": String, res: any})
const saniString = sani(String)

function mkRecursiveFuncProxy(cb: (dotJoinedPath: string, args: unknown[]) => unknown, res: unknown | Promise<unknown> = {}, prevPath = "") {
  return new Proxy((...args: any[]) => {
    return cb(prevPath !== "" ? prevPath.slice(1) : null, args)
  }, {
    get(target, key: string) {
      if (key === "then" || key === "catch") {
        if (res instanceof Promise) return res[key].bind(res)
        else return undefined
      }
      try {saniString(key)} catch(e) {return undefined}
      if (res instanceof Promise) return mkRecursiveFuncProxy(cb, res.then((res) => {
        if (res !== null && Object.hasOwn(res, key)) return res[key]
        else return undefined
      }), prevPath + "." + key)
      else if (res !== null && typeof res === "object" && Object.hasOwn(res, key) && typeof res[key] !== "object") return res[key]
      else return mkRecursiveFuncProxy(cb, res[key], prevPath + "." + key)
    }
  })
}




export function dummyAdapterPair() {
  const aCbs = []
  const a = {
    onMsg: (cb: Function) => {
      aCbs.push(cb)
    },
    send: (msg: unknown) => {
      bCbs.forEach(cb => cb(msg))
    }
  } as Adapter
  const bCbs = []
  const b = {
    onMsg: (cb: Function) => {
      bCbs.push(cb)
    },
    send: (msg: unknown) => {
      aCbs.forEach(cb => cb(msg))
    }
  } as Adapter

  return {a, b}
}
