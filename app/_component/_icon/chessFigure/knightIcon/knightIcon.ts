import Icon from "../chessFigure";
import declareComponent from "../../../../lib/declareComponent";

export default class KnightIcon extends Icon {
  pug() {
    return require("./knightIcon.pug").default
  }
  stl() {
    return super.stl() + require("./knightIcon.css").toString()
  }
}

declareComponent("c-knight-icon", KnightIcon)
