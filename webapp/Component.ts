import BaseComponent from "sap/ui/core/UIComponent";
import { createDeviceModel } from "./model/models";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";

/**
 * @namespace bjmproject
 */
export default class Component extends BaseComponent {

    public static metadata = {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    };

    public init(): void {
        // Gọi hàm init của BaseComponent
        super.init();
    
        // Gắn device model
        this.setModel(createDeviceModel(), "device");
    
        // Khởi tạo router
        this.getRouter().initialize();
    
        // Lấy URL của ODataModel từ manifest.json
        const oDataSource = this.getManifestEntry("sap.app").dataSources.mainService;
        const sServiceUrl = oDataSource.uri;
    
        // Khởi tạo ODataModel
        const oModel = new ODataModel(sServiceUrl, {
            useBatch: false, // Tắt chế độ batch nếu không cần thiết
        });
    
        // Gắn ODataModel vào Component
        this.setModel(oModel);
    
        // Khởi tạo jobModel
        const oJSONModel = new sap.ui.model.json.JSONModel({
            counts: {
                all: 0,
                Scheduled: 0,
                Released: 0,
                Ready: 0,
                Active: 0,
                Running: 0,
                Aborted: 0,
                Finished: 0,
            },
            ZG3_ET_UI5Set: [] // Dữ liệu bảng
        });
    
        // Gắn jobModel vào Component
        this.setModel(oJSONModel, "jobModel");
    }
}