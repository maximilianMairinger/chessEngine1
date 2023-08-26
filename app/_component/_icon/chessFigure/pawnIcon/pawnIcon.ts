import Icon from "../chessFigure";
import declareComponent from "../../../../lib/declareComponent";

export default class PawnIcon extends Icon {
  pug() {
    return require("./pawnIcon.pug").default
  }
  stl() {
    return super.stl() + require("./pawnIcon.css").toString()
  }
}

declareComponent("c-pawn-icon", PawnIcon)
