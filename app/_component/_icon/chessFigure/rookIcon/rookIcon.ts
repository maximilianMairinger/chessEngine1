import Icon from "../chessFigure";
import declareComponent from "../../../../lib/declareComponent";

export default class RookIcon extends Icon {
  pug() {
    return require("./rookIcon.pug").default
  }
  stl() {
    return super.stl() + require("./rookIcon.css").toString()
  }
}

declareComponent("c-rook-icon", RookIcon)
