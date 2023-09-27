import ajaon from "ajaon"
import { functionBasedClient, functionBasedServer, dummyAdapterPair } from "./../app/lib/functionalAdapter2"
import delay from "tiny-delay"

console.log("running");



(async () => {
  const { a, b } = dummyAdapterPair()

  const client = functionBasedClient(a)

  functionBasedServer(b, {
    async test(prefix: string) {
      console.log("call test")
      await delay(1000)
      return (lel: string) => {
        console.log("call inner")
        return prefix + lel + "lel"
      }
    }
  })


  // console.log(client)
  console.log(await client.test("pre")("mid"))
  
})()
