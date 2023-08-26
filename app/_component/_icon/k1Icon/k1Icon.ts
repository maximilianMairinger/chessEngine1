import Icon from "../icon";
import declareComponent from "../../../lib/declareComponent";

export default class K1Icon extends Icon {
  pug() {
    return require("./k1Icon.pug").default
  }
  stl() {
    return super.stl() + require("./k1Icon.css").toString()
  }
}

declareComponent("c-k1-icon", K1Icon)
