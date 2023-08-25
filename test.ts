// deno-lint-ignore-file

import { solve } from "sat-solver"
import Logic from "logic-solver"
import { load as cheerioHTML, Element } from "cheerio"
import { MultiMap, BidirectionalMap } from "more-maps"
import { constructIndex as keyIndex } from "key-index"
import { BidirectionalMultiMap } from "more-maps"
import _combinations from "combinations"
import { timoi } from "timoi"
import SyncProm from "sync-p"




const equalAndQuotesRequiredPerAttribute = false
const equalsAndQuotesCoefficient = 1 + (equalAndQuotesRequiredPerAttribute ? 3 : 0)  // 4 as in: name="value". So 4 extra characters. Or 1 for the space between attrs


const alphabet = "abcdefghijklmnopqrstuvwxyz"
function getAlphabeticUID() {
  let globalInc = -1
  return function next(n = 1) {
    globalInc += n
    let myInc = globalInc
    let uid = ""
    while (true) {
      uid = alphabet[myInc % alphabet.length] + uid
      myInc = Math.floor(myInc / alphabet.length) - 1
      if (myInc === -1) break
    }
    
    return uid
  }
}


function includesAll<T>(a: T[], allOfAandMore: T[]) {
  for (const elem of a) if (!allOfAandMore.includes(elem)) return false
  return true
}

// const c = keyIndex(() => 0)

// combinations(new Array(10)).forEach((a: any) => {
//   const l = a.length
//   c(l, c(l) + 1)
// }, Map)

// console.log("ent", [...c.entries()].map(([k, v]) => ({k, v})))

class MyBidirectionalMap<K, V> extends BidirectionalMap<K, V> {
  rev() {
    return this.reverse
  }
}


function hoistCommonAttributesIntoGroup(content: string) {
  const $ = cheerioHTML(content)
  

  const attrbUidToNameMap = new Map<AttrbUID, string>()
  const elemAttrMap = new BidirectionalMultiMap<Element, AttrbUID>();
  const nextUID = getAlphabeticUID()




  type FullyQualifiedAttrbInJSON = string
  type AttrbUID = string
  const indexOfUniqueVars = keyIndex((jsonAttrb: FullyQualifiedAttrbInJSON) => {
    return nextUID()
  }, MyBidirectionalMap as typeof Map) as any as ((val: string) => string) & MyBidirectionalMap<FullyQualifiedAttrbInJSON, AttrbUID>


  for (const elem of [...$("svg *")]) {
    for (const {name, value} of elem.attributes) {
      if (name === "style") return content
      if (name === "clip-path") return content
      if (name === "mask") return content
    }
  }

  for (const elem of [...$("svg *")]) {
    for (const {name, value} of elem.attributes) {
      if (name === "transform") continue
      const uid = indexOfUniqueVars(JSON.stringify({name, value}))
      attrbUidToNameMap.set(uid, name)
      elemAttrMap.add(elem, uid)
    }
    
  }

  const elemTermMap = new Map<Element, Logic.Term>()
  for (const [element, hasAttributes] of elemAttrMap) {
    const doesntHaveAttributes = new Set(elemAttrMap.values())
    for (const attrb of hasAttributes) doesntHaveAttributes.delete(attrb)

    elemTermMap.set(element, Logic.and(Logic.or(...hasAttributes), Logic.not(Logic.or(...doesntHaveAttributes))))
  }

  
  const $svg = $($("svg"))
  // only get this for groups that are really ending up in the final result
  const tempElemForGroup = keyIndex((groupPointer: any) => {
    const g = $("<g>")
    $svg.append(g)
    return g
  })
  const tempElemForGroupSet = new Set()
  
  function recCanBeCombined(elemTermMap: Map<Element, Logic.Term>, elemAttrMap: BidirectionalMultiMap<Element, string>, attrbUidToNameMap: Map<string, string>) {
    const canBeCombs = findPossibleCommonFactorsByCombinationAndReverseAttrLookup(elemTermMap, elemAttrMap, attrbUidToNameMap)
    const canBeCombSet = [] as CanBeSetG
    for (const canBe of canBeCombs) {
      const copyElemTermMap = new Map(elemTermMap)
      const copyElemAttrMap = new BidirectionalMultiMap(elemAttrMap)

      const doesntHaveAttributes = new Set(elemAttrMap.values())
      for (const attrb of canBe.uidAttrbs) doesntHaveAttributes.delete(attrb)
      const newTerm = Logic.and(Logic.or(...canBe.uidAttrbs), Logic.not(Logic.or(...doesntHaveAttributes)))


      const attribs = {} as any; for (const uid of canBe.uidAttrbs) attribs[attrbUidToNameMap.get(uid)!] = true;
      const newElemTemp = {groupPlaceHolder: true, attribs} as any as Element
      tempElemForGroupSet.add(newElemTemp)

      

      for (const uid of canBe.uidAttrbs) copyElemAttrMap.add(newElemTemp, uid)
      copyElemTermMap.set(newElemTemp, newTerm)

      for (const element of canBe.elements) {
        copyElemAttrMap.delete(element)
        copyElemTermMap.delete(element)
      }

      

      canBeCombSet.push({...canBe, groupPointer: newElemTemp, deeper: recCanBeCombined(copyElemTermMap, copyElemAttrMap, attrbUidToNameMap)})
    }

    return canBeCombSet
  }

  
  const canBeCombinedSet = recCanBeCombined(elemTermMap, elemAttrMap, attrbUidToNameMap)  

  
  console.log(JSON.stringify(displayCanBeCombinedSet(canBeCombinedSet), undefined, 4))
  console.log(displayCanBeCombinedSet(canBeCombinedSet))


  const {bestCanBe} = findBestCanBe(canBeCombinedSet, indexOfUniqueVars)
  

  console.log("bestCanBe", displayBestCanBe(bestCanBe))

  function getElem(el: any) {
    if (tempElemForGroupSet.has(el)) return tempElemForGroup(el)
    return el
  }

  function applyBestCanBe(bestCanBe: BestCanBe) {
    const g = tempElemForGroup(bestCanBe.groupPointer)
    const elems = bestCanBe.elements.map(getElem)
    for (const elem of elems) {
      g.append(elem)
    }
    for (const uid of bestCanBe.uidAttrbs) {
      const attrJson = indexOfUniqueVars.rev().get(uid)!
      const {name, value} = JSON.parse(attrJson)
      for (const elem of elems) $(elem).removeAttr(name)
      g.attr(name, value)
    }
    
    if (bestCanBe.deeper) applyBestCanBe(bestCanBe.deeper)
  }

  
  function findBestCanBe(canBeSet: CanBeSetG, indexOfUniqueVars: ((val: string) => string) & MyBidirectionalMap<string, string>, attrsOfChild = [] as string[], childElemLen = 0): { bestCanBeLen: number, bestCanBe: BestCanBe | undefined, workedThroughAttrUID: Set<string> } {
    let bestCanBeLen = 0 
    let bestCanBe: BestCanBe | undefined = undefined
    let workedThroughAttrUID = new Set<string>()


    // compute deepers first, as they are the ones more shallow in the tree. And we want those first in the workedThroughAttrUID set.
    const deepers = canBeSet.map((canBe) => findBestCanBe(canBe.deeper, indexOfUniqueVars, canBe.uidAttrbs, canBe.elements.length))

    for (let i = 0; i < canBeSet.length; i++) {
      const canBe = canBeSet[i]
      const deeperBest = deepers[i]
      
      let allAttrOnceLen = 0
      const myWorkedThroughAttrUID = deeperBest.workedThroughAttrUID
      for (const attr of canBe.uidAttrbs) {
        if (myWorkedThroughAttrUID.has(attr)) continue
        const ob = JSON.parse((indexOfUniqueVars.rev().get(attr) as string)) as {name: string, value: string}
        allAttrOnceLen += ob.name.length + ob.value.length + equalsAndQuotesCoefficient 
      }


      

      


      
      let childHasAllAttrs = includesAll(canBe.uidAttrbs, attrsOfChild)

      const elementLength = canBe.elements.length + (childHasAllAttrs ? childElemLen - 1 : 0) // the -1 in childElemLen - 1 is here because part of the childs element is this group. Which doesnt count for the efficiency of the propagated (to children) attrbs
      // Len count -1 as the attr needs to be written in the group as well
      const myLen = (elementLength - 1) * allAttrOnceLen + deeperBest.bestCanBeLen - 7 // `<g></g>`.length = 7. Cost of making a group
      if (myLen > bestCanBeLen) {
        for (const attr of canBe.uidAttrbs) myWorkedThroughAttrUID.add(attr)
        workedThroughAttrUID = myWorkedThroughAttrUID
        bestCanBeLen = myLen
        bestCanBe = {...canBe, deeper: deeperBest.bestCanBe}
      }
    }

    


    return {bestCanBe, bestCanBeLen, workedThroughAttrUID}
  }
  
  if (bestCanBe) applyBestCanBe(bestCanBe)

  return $("body").html()!
}



// <path a d/>
// <path a b c/>
// <path b c d/>

const time = timoi()
const result = hoistCommonAttributesIntoGroup(`
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 35 36">
  <path x bbb/>
  <path y bbb/>
  <path y bbb/>
  <path y bbb/>
  <path y bbb/>
  <path y bbb/>
  

  
</svg>
`)

console.log(result)

Deno.writeTextFileSync("./test.svg", result)

time()


// const query = `
// (((a or d) and !c and !b) and ((a or b or c) and !d)) or
// (((a or b or c) and !d) and ((b or c or d) and !a)) or
// (((b or c or d) and !a) and ((a or d) and !c))
// `


type BestCanBe = CanBesG[number] & {deeper?: BestCanBe}



type CanBes = {elements: Element[], attrbsName: string[], uidAttrbs: string[]}[]
type CanBesG = (CanBes[number] & {groupPointer: any})[]

function findPossibleCommonFactorsByCombinationAndReverseAttrLookup(elemTermMap: Map<Element, Logic.Term>, elemAttrMap: BidirectionalMultiMap<Element, string>, attrbUidToNameMap: Map<string, string>): CanBes {
  const canBeCombined = [] as CanBes
  const entries = [...elemTermMap.entries()]
  

  
  const terms = [] as Logic.Term[]
  for (const comb of combinations(entries, 2)) {
    const subTerms = [] as Logic.Term[]
    for (const [elem, term] of comb) {
      subTerms.push(term)
    }
    terms.push(Logic.and(...subTerms))
  }

  const _soulver = new Logic.Solver()
  _soulver.require(Logic.or(...terms))
  const solver = solve(_soulver)
  const allMatches = solver.findAll()


  for (const match of allMatches) {
    const attrbs = [] as string[]
    for (const attrbUID in match) {
      if (!match[attrbUID]) continue
      const attrb = attrbUID
      attrbs.push(attrb)
    }

    const elementsPerAttr = [] as Element[][]
    for (const attr of attrbs) {
      const elements = elemAttrMap.reverse.getAll(attr)
      elementsPerAttr.push(elements)
    }

    const allElemsThatHaveAllRequiredAttrs = elementsPerAttr.reduce((a, b) => {
      const intersection = a.filter(c => b.includes(c))
      return intersection
    })

    canBeCombined.push({
      elements: allElemsThatHaveAllRequiredAttrs,
      uidAttrbs: attrbs,
      attrbsName: attrbs.map(attrbUID => attrbUidToNameMap.get(attrbUID) as string)
    })

  }

  return canBeCombined
}


function findPossibleCommonFactorsByCombinationAndPerElementSatSolving(elemTermMap: Map<Element, Logic.Term>, elemAttrMap: BidirectionalMultiMap<Element, string>, attrbUidToNameMap: Map<string, string>): CanBes {
  const canBeCombined = [] as CanBes
  const entries = [...elemTermMap.entries()]



  for (const comb of combinations(entries, 2)) {
    const allTerms = [] as Logic.Term[]
    const allElems = []
    for (const [ elem, term ] of comb) {
      allElems.push(elem)
      allTerms.push(term)
    }
    
  
    const _soulver = new Logic.Solver()
    _soulver.require(Logic.and(...allTerms))
    const solver = solve(_soulver)
    const allMatches = solver.findAll()
    
    for (const match of allMatches) {
      const attrbsName = [] as string[]
      for (const attrbUID in match) {
        if (!match[attrbUID]) continue
        const attrb = attrbUidToNameMap.get(attrbUID) as string
        attrbsName.push(attrb)
      }
  
      if (attrbsName.length > 0 && allElems) {
        canBeCombined.push({
          elements: allElems,
          uidAttrbs: Object.keys(match),
          attrbsName
        })
      }
    }
  }
  return canBeCombined
}


type CanBeSet = (CanBes[number] & {deeper: CanBeSet})[]  
type CanBeSetG = (CanBesG[number] & {deeper: CanBeSetG})[]
function displayCanBeCombinedSet(canBeCombined: CanBeSet): any {
  return canBeCombined.map(({elements, attrbsName, deeper}) => ({attrbsName, elements: elements.map(elem => Object.keys(elem.attribs)), deeper: displayCanBeCombinedSet(deeper)}))
}

function displayBestCanBe(bestCanBe: BestCanBe | undefined): any {
  if (bestCanBe === undefined) return undefined
  return {attrbsName: bestCanBe.attrbsName, elements: bestCanBe.elements.map(elem => Object.keys(elem.attribs)), deeper: displayBestCanBe(bestCanBe.deeper)}
}


function displaySetRes(out: any) {
  const logs = []
  for (const line of out) {
    let s = []
    for (const k in line) {
      if (!line[k]) {
        s.push(`!${k}`)
      } else {
        s.push(k)
      }
    }
    logs.push(s.join(" & "))
  }

  return logs
}

function combinations(a: any[], min?: number, max?: number) {
  if (min !== undefined) if (min > a.length) return []
  return _combinations(a, min, max)
}


