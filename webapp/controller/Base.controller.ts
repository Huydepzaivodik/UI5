import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";

export default class BaseController extends Controller {
  protected getRouter(): sap.ui.core.routing.Router {
    return UIComponent.getRouterFor(this);
  }

  protected getModel(sName?: string): sap.ui.model.Model {
    return this.getView().getModel(sName);
  }

  protected setModel(oModel: sap.ui.model.Model, sName?: string): void {
    this.getView().setModel(oModel, sName);
  }
}