import declareComponent from "../../../lib/declareComponent"
import Icon from "../icon"
import { BodyTypes } from "./pugBody.gen"; import "./pugBody.gen"

export default class ChessFigure extends Icon {
  protected body: BodyTypes

  constructor(color: "white" | "black") {
    super()

    this.addClass("figure")
    this.addClass(color)
  }

  stl() {
    return super.stl() + require("./chessFigure.css").toString()
  }
  pug() {
    return require("./chessFigure.pug").default
  }
}

