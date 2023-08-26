import Icon from "../chessFigure";
import declareComponent from "../../../../lib/declareComponent";

export default class BishopIcon extends Icon {
  pug() {
    return require("./bishopIcon.pug").default
  }
  stl() {
    return super.stl() + require("./bishopIcon.css").toString()
  }
}

declareComponent("c-bishop-icon", BishopIcon)
