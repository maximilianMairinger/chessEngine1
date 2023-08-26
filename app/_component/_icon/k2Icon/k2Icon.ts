import Icon from "../icon";
import declareComponent from "../../../lib/declareComponent";

export default class K2Icon extends Icon {
  pug() {
    return require("./k2Icon.pug").default
  }
  stl() {
    return super.stl() + require("./k2Icon.css").toString()
  }
}

declareComponent("c-k2-icon", K2Icon)
