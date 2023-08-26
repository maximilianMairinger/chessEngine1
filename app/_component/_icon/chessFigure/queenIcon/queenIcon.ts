import Icon from "../chessFigure";
import declareComponent from "../../../../lib/declareComponent";

export default class QueenIcon extends Icon {
  pug() {
    return require("./queenIcon.pug").default
  }
  stl() {
    return super.stl() + require("./queenIcon.css").toString()
  }
}

declareComponent("c-queen-icon", QueenIcon)
