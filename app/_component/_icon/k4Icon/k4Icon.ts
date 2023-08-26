import Icon from "../icon";
import declareComponent from "../../../lib/declareComponent";

export default class K4Icon extends Icon {
  pug() {
    return require("./k4Icon.pug").default
  }
  stl() {
    return super.stl() + require("./k4Icon.css").toString()
  }
}

declareComponent("c-k4-icon", K4Icon)
