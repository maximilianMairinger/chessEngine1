import Icon from "../icon";
import declareComponent from "../../../lib/declareComponent";

export default class K3Icon extends Icon {
  pug() {
    return require("./k3Icon.pug").default
  }
  stl() {
    return super.stl() + require("./k3Icon.css").toString()
  }
}

declareComponent("c-k3-icon", K3Icon)
