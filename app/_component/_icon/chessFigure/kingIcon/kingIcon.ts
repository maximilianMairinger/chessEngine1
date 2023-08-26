import Icon from "../chessFigure";
import declareComponent from "../../../../lib/declareComponent";

export default class KingIcon extends Icon {
  pug() {
    return require("./kingIcon.pug").default
  }
  stl() {
    return super.stl() + require("./kingIcon.css").toString()
  }
}

declareComponent("c-king-icon", KingIcon)
