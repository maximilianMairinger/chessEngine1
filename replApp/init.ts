import ajaon from "ajaon"
import { functionBasedClient, functionBasedServer, dummyAdapterPair } from "./../app/lib/functionalAdapter2"
import delay from "tiny-delay"





(async () => {
  const { a, b } = dummyAdapterPair()



  
  

  const lelelelle = functionBasedServer(b, {
    test(prefix: string) {
      // console.log("call test")
      // await delay(1000)
      return (lel: string) => {
        return new Promise((res) => {
          setTimeout(() => {
            res(prefix + 3 + lel)
          }, 1000)
        })
        
        // return {
        //   end: (s) => {
        //     return prefix + lel + s 
        //   },
        //   deeper: {
        //     lel() {
        //       return 2
        //     }
        //   },
        //   qwe: new Promise((res) => {
        //     // res(2)
        //     setTimeout(() => {
        //       res(2)
        //     }, 1000)
        //   }),
        //   start(s) {
        //     return s + prefix + lel
        //   },
        //   soFar: prefix + lel
        // }
      }
    },
    
    then: {
      lel(lel: number) {
        return new Promise<(lel2: string) => string>((res) => {
          setTimeout(() => {
            res((lel2: string) => {
              return "whoo " + lel + " " + lel2
            })
          }, 1000)
        })
      }
    }

  })

  
  
  const client = functionBasedClient(a) as typeof lelelelle
  // client.test("qwe")("qwe")

  // debugger
  // console.log(client)
  // console.log(await client.test("pre")(" lel"))
  client.then.lel(2)("lel2").then((r) => {
    console.log(r)
  })
  
})()
