import BaseController from "./Base.controller";

export default class JobDetails extends BaseController {
  public onInit(): void {
    const oRouter = this.getOwnerComponent()?.getRouter();
    oRouter.getRoute("JobDetails").attachPatternMatched(this._onObjectMatched, this);
  }

  private _onObjectMatched(oEvent: any): void {
    const sJobId = oEvent.getParameter("arguments")?.jobId; // Lấy jobId từ URL
    const oView = this.getView();
    const oModel = this.getOwnerComponent().getModel(); // Lấy ODataModel mặc định
    console.log("Job ID from URL:", sJobId);

    if (!oModel) {
      console.error("ODataModel not found");
      return;
    }

    // Sử dụng metadataLoaded để đảm bảo metadata đã được tải
    oModel.metadataLoaded().then(() => {
      const sPath = `/ZG3_ET_UI5_01Set('${sJobId}')`;
      console.log("Binding path:", sPath);

      const oData = oModel.getProperty(sPath);
      if (!oData) {
        console.log(`Data for Job ID ${sJobId} not found in model. Loading from backend...`);

        oModel.read(sPath, {
          success: (oData: any) => {
            console.log("Data loaded successfully from backend:", oData);
        
            oView.bindElement({
              path: sPath,
              model: undefined,
            });
          },
          error: (err: any) => {
            console.error("Error loading data from backend:", err);
        
            // Kiểm tra nếu lỗi là 404
            if (err?.statusCode === "404") {
              sap.m.MessageBox.error("Job không tồn tại hoặc đã bị xóa.");
            } else {
              sap.m.MessageBox.error("Không thể tải dữ liệu chi tiết của Job. Vui lòng thử lại sau.");
            }
        
            // Điều hướng về màn hình trước
            this.getRouter().navTo("ViewReport");
          },
        });
      } else {
        console.log(`Data for Job ID ${sJobId} found in model. Binding to view...`);

        oView.bindElement({
          path: sPath,
          model: undefined,
          events: {
            change: () => {
              console.log("Data successfully bound to the view");
            },
            dataRequested: () => {
              console.log("Data request started");
            },
            dataReceived: (oEvent: any) => {
              const oData = oEvent.getParameter("data");
              if (!oData) {
                console.error(`No data found for Job ID ${sJobId}`);
              } else {
                console.log("Data received:", oData);
              }
            },
          },
        });
      }
    }).catch((err: any) => {
      console.error("Error loading metadata:", err);

      // Hiển thị thông báo lỗi rõ ràng hơn
      sap.m.MessageBox.error("Không thể tải metadata. Vui lòng thử lại sau.");
    });
  }

  public onNavBack(): void {
    this.getRouter().navTo("ViewReport"); // Navigate back to the main view
  }
}