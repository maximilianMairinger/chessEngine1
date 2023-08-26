import declareComponent from "../../lib/declareComponent"
import Component from "../component"
import { BodyTypes } from "./pugBody.gen"; import "./pugBody.gen"
import Pawn from "../_icon/chessFigure/pawnIcon/pawnIcon";
import Rook from "../_icon/chessFigure/rookIcon/rookIcon";
import Knight from "../_icon/chessFigure/knightIcon/knightIcon";
import Bishop from "../_icon/chessFigure/bishopIcon/bishopIcon";
import Queen from "../_icon/chessFigure/queenIcon/queenIcon";
import King from "../_icon/chessFigure/kingIcon/kingIcon";
import { DataBase } from "josm";
import { mergeKeysDeepButNotCyclic, cloneKeys } from "circ-clone"



const pieces = {
  pawn: Pawn,
  rook: Rook,
  knight: Knight,
  bishop: Bishop,
  queen: Queen,
  king: King
} as const


type Row = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
type Col = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"
type PieceKind = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king"
type Piece = {kind: PieceKind, color: "white" | "black"}

type Board<P = Piece> = {[row in Row]: {[col in Col]: P}}

export default class ChessBoard extends Component {
  protected body: BodyTypes

  public board = new DataBase({
    "1": {},
    "2": {},
    "3": {},
    "4": {},
    "5": {},
    "6": {},
    "7": {},
    "8": {}
  } as Board)


  private htmlFields = {} as Board<HTMLElement>

  constructor(side: "white" | "black" = "white") {
    super()

    const lastBoard = cloneKeys(this.board()) as Board




    const b = this.board()

    const initWhite = side === "white"
    let toggle = initWhite
    for (const row of ["1", "8"] as const) {
      const color = toggle ? "white" : "black"
      toggle = !toggle
      this.board[row]({
        a: {kind: "rook", color},
        b: {kind: "knight", color},
        c: {kind: "bishop", color},
        d: {kind: "queen", color},
        e: {kind: "king", color},
        f: {kind: "bishop", color},
        g: {kind: "knight", color},
        h: {kind: "rook", color}
      })
    }

    toggle = initWhite
    for (const row of ["2", "7"] as const) {
      const color = toggle ? "white" : "black"
      toggle = !toggle
      this.board[row]({
        a: {kind: "pawn", color},
        b: {kind: "pawn", color},
        c: {kind: "pawn", color},
        d: {kind: "pawn", color},
        e: {kind: "pawn", color},
        f: {kind: "pawn", color},
        g: {kind: "pawn", color},
        h: {kind: "pawn", color}
      })
    }

    for (const row of ["3", "4", "5", "6"] as const) {
      this.board[row]({
        a: null,
        b: null,
        c: null,
        d: null,
        e: null,
        f: null,
        g: null,
        h: null
      })
    }



    
    let outerToggle = true
    for (const key1 of Object.keys(b).Reverse()) {

      const row = this.htmlFields[key1] = {}
      const b2 = b[key1]

      let innerToggle = outerToggle
      outerToggle = !outerToggle
      for (const key2 of Object.keys(b2)) {
        const tile = ce("chess-tile")
        tile.classList.add(innerToggle ? "light" : "dark")
        this.apd(tile)
        row[key2] = tile
        tile.setAttribute("name", key2 + key1)

        innerToggle = !innerToggle
      }
    } 


    
    this.board((full, diff) => {
      const toRemove = [] as {piece: Piece, row: Row, col: Col}[]
      const toAdd = [] as {piece: Piece, row: Row, col: Col}[]
      for (const row in diff) {
        for (const col in diff[row]) {
          const piece = diff[row][col] as Piece
          if (piece === null) toRemove.push({piece: lastBoard[row][col] as Piece, row: row as Row, col: col as Col})
          else toAdd.push({piece, row: row as Row, col: col as Col})
        }
      }


      if (this.enableAnim && toRemove.length === 1 && toAdd.length === 1 && toRemove[0].piece === toAdd[0].piece) {
        const fromField = this.htmlFields[toRemove[0].row][toRemove[0].col]
        const fig = fromField.querySelector(".figure")

        const toField = this.htmlFields[toAdd[0].row][toAdd[0].col]
        toField.anim({translateX: toField.offsetLeft - fromField.offsetLeft, translateY: toField.offsetTop - fromField.offsetTop}).then(() => {
          toField.apd(fig)
          fig.css("transform", "none")
        })
      }
      else {
        for (const rm of toRemove) this.htmlFields[rm.row][rm.col].emptyNodes()
        for (const add of toAdd) this.htmlFields[add.row][add.col].apd(new pieces[add.piece.kind](add.piece.color))
      }

      mergeKeysDeepButNotCyclic(lastBoard, diff)
    })


  }

  enableAnim = true

  stl() {
    return super.stl() + require("./chessBoard.css").toString()
  }
  pug() {
    return require("./chessBoard.pug").default
  }
}

declareComponent("c-chess-board", ChessBoard)
