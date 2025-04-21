import BaseController from "./Base.controller";
import formatter from "../model/formatter";
import Filter from "sap/ui/model/Filter"; // Import Filter từ đúng module
import FilterOperator from "sap/ui/model/FilterOperator"; // Import FilterOperator từ đúng module
import SearchField from "sap/m/SearchField"; // Import SearchField từ đúng module
import Event from "sap/ui/base/Event"; // Import Event từ đúng module
import { sap } from "sap/ui/core/library"; // Import sap từ đúng module
import JSONModel from "sap/ui/model/json/JSONModel";


//hehe
export default class ViewReport extends BaseController {
  public formatter = formatter;

  public onInit(): void {
    const oModel =
      this.getOwnerComponent()?.getModel() as sap.ui.model.odata.v2.ODataModel;
    if (!oModel) {
      console.error("Model not found");
      return;
    }

    this._mFilters = {
      All: [],
      Scheduled: [new Filter("Status", FilterOperator.EQ, "P")],
      Released: [new Filter("Status", FilterOperator.EQ, "S")],
      Ready: [new Filter("Status", FilterOperator.EQ, "Y")],
      Active: [new Filter("Status", FilterOperator.EQ, "Z")],
      Running: [new Filter("Status", FilterOperator.EQ, "R")],
      Canceled: [new Filter("Status", FilterOperator.EQ, "A")],
      Finished: [new Filter("Status", FilterOperator.EQ, "F")],
    };

    // Khởi tạo jobModel
    const oJSONModel = new JSONModel({
      counts: {
        All: 0,
        Scheduled: 0,
        Released: 0,
        Ready: 0,
        Active: 0,
        Running: 0,
        Canceled: 0,
        Finished: 0,
      },
      selectedTab: "All", // <-- thêm dòng này
      ZG3_ET_UI5_01Set: [],
    });

    this.getOwnerComponent()?.setModel(oJSONModel, "jobModel");
    oModel.read("/ZG3_ET_UI5_01Set", {
      success: (oData: { results: any[] }) => {
        console.log("Data loaded successfully", oData.results);

        // Gắn dữ liệu vào jobModel
        const oJSONModel = this.getOwnerComponent()?.getModel(
          "jobModel"
        ) as sap.ui.model.json.JSONModel;
        if (oJSONModel) {
          oJSONModel.setProperty("/ZG3_ET_UI5_01Set", oData.results);
        }
      },
      error: (err: any) => {
        console.error("Error loading data", err);
      },
    });
  }

  public onSearch(
    oEvent: Parameters<SearchField["attachLiveChange"]>[0]
  ): void {
    const sQuery =
      oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";

    const oTable = this.getView().byId("jobTable") as any; // Fallback to any for type resolution
    const oBinding = oTable.getBinding("items");

    if (oBinding) {
      const aFilters = sQuery
        ? [
            new Filter("Jobname", FilterOperator.Contains, sQuery),
            new Filter("Id", FilterOperator.Contains, sQuery),
            new Filter("Status", FilterOperator.Contains, sQuery),
            new Filter("Authcknam", FilterOperator.Contains, sQuery),
          ]
        : [];

      oBinding.filter(
        aFilters.length > 0 ? new Filter({ filters: aFilters, and: false }) : []
      );
    }
  }

  // public onIconTabSelect(oEvent: Event): void {
  //   const sSelectedKey = oEvent.getParameter("key");
  //   const oTable = this.byId("jobTable") as sap.m.Table;
  //   const oBinding = oTable.getBinding("items");

  //   if (oBinding) {
  //     const aFilters = this._mFilters[sSelectedKey] || [];
  //     oBinding.filter(aFilters);
  //   }
  // };

  // public onIconTabSelect(oEvent: sap.ui.base.Event): void {
  //   const sSelectedKey = oEvent.getParameter("key");
  //   console.log("Selected key:", sSelectedKey);

  //   const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
  //   oModel.setProperty("/selectedTab", sSelectedKey);

  //   const oTable = this.byId("jobTable") as sap.m.Table;
  //   const oBinding = oTable.getBinding("items");

  //   if (!oBinding) {
  //     console.error("Table binding not found");
  //     return;
  //   }

  //   // Lấy bộ lọc tương ứng với key
  //   const aFilters = sSelectedKey === "all" ? [] : this._mFilters[sSelectedKey];
  //   oBinding.filter(aFilters);

  //   // Cập nhật tiêu đề động
  //   const oViewModel = this.getOwnerComponent()?.getModel("jobModel") as sap.ui.model.json.JSONModel;
  //   if (oViewModel) {
  //     const oCounts = oViewModel.getProperty("/counts");
  //     const iCount = sSelectedKey === "all" ? oCounts.all : oCounts[sSelectedKey];
  //     const oResourceBundle = this.getOwnerComponent()?.getModel("i18n")?.getResourceBundle();
  //     const sTitle = oResourceBundle?.getText("JobsReportTableTitle", [iCount]);
  //     this.getView().byId("jobTableToolbar").getContent()[0].setText(sTitle);
  //   }
  // }

  //thêm bóng cho biểu đồ
  // public onIconTabSelect(oEvent: sap.ui.base.Event): void {
  //   const sSelectedKey = oEvent.getParameter("key");
  //   console.log("Selected key:", sSelectedKey);

  //   const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
  //   oModel.setProperty("/selectedTab", sSelectedKey);

  //   const oTable = this.byId("jobTable") as sap.m.Table;
  //   const oBinding = oTable?.getBinding("items");

  //   if (oBinding) {
  //     const aFilters =
  //       sSelectedKey === "all" ? [] : this._mFilters[sSelectedKey];
  //     oBinding.filter(aFilters);
  //   }

  //   // 🔁 Khôi phục phần cập nhật tiêu đề bảng
  //   const oViewModel = oModel;
  //   if (oViewModel) {
  //     const oCounts = oViewModel.getProperty("/counts");
  //     const iCount =
  //       sSelectedKey === "all" ? oCounts.All : oCounts[sSelectedKey];
  //     const oResourceBundle = this.getOwnerComponent()
  //       ?.getModel("i18n")
  //       ?.getResourceBundle();
  //     const sTitle = oResourceBundle?.getText("JobsReportTableTitle", [iCount]);
  //     this.getView().byId("jobTableToolbar").getContent()[0].setText(sTitle);
  //   }

  //   // ✅ Gọi lại biểu đồ sau khi tab đổi
  //   setTimeout(() => {
  //     const counts = oModel.getProperty("/counts");
  //     const totalJobs =
  //       counts.Scheduled +
  //       counts.Released +
  //       counts.Ready +
  //       counts.Active +
  //       counts.Running +
  //       counts.Canceled +
  //       counts.Finished;
  //     this._renderCharts(counts, totalJobs);
  //   }, 0);
  // }
  public onIconTabSelect(oEvent: sap.ui.base.Event): void {
    const sSelectedKey = oEvent.getParameter("key");
    console.log("IconTabSelect called, key:", sSelectedKey);
  
    // Lấy jobModel
    const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    if (!oModel) {
      console.error("jobModel not found");
      return;
    }
  
    // Xử lý tab biểu đồ (tab1, tab2)
    if (sSelectedKey === "tab1" || sSelectedKey === "tab2") {
      // Chỉ làm mới biểu đồ, không thay đổi bộ lọc hoặc /selectedTab
      setTimeout(() => {
        const counts = oModel.getProperty("/counts") || {};
        const totalJobs =
          (counts.Scheduled || 0) +
          (counts.Released || 0) +
          (counts.Ready || 0) +
          (counts.Active || 0) +
          (counts.Running || 0) +
          (counts.Canceled || 0) +
          (counts.Finished || 0);
        this._renderCharts(counts, totalJobs);
      }, 0);
      return;
    }
  
    // Xử lý tab trạng thái (All, Scheduled, Ready, v.v.)
    oModel.setProperty("/selectedTab", sSelectedKey);
  
    const oTable = this.byId("jobTable") as sap.m.Table;
    const oBinding = oTable.getBinding("items");
    if (!oBinding) {
      console.error("Table binding not found");
      return;
    }
  
    // Áp dụng bộ lọc
    const aFilters = this._mFilters[sSelectedKey] || [];
    console.log("Applying filter for status:", sSelectedKey, "Filters:", aFilters);
    oBinding.filter(aFilters);
  
    // Cập nhật tiêu đề động
    const oCounts = oModel.getProperty("/counts") || {};
    const iCount = sSelectedKey === "All" ? oCounts.All || 0 : oCounts[sSelectedKey] || 0;
    const oResourceBundle = this.getOwnerComponent()?.getModel("i18n")?.getResourceBundle();
    const sTitle = oResourceBundle?.getText("JobsReportTableTitle", [iCount]) || `Jobs (${iCount})`;
    this.getView().byId("jobTableToolbar").getContent()[0].setText(sTitle);
  
    // Làm mới biểu đồ
    setTimeout(() => {
      const counts = oModel.getProperty("/counts") || {};
      const totalJobs =
        (counts.Scheduled || 0) +
        (counts.Released || 0) +
        (counts.Ready || 0) +
        (counts.Active || 0) +
        (counts.Running || 0) +
        (counts.Canceled || 0) +
        (counts.Finished || 0);
      this._renderCharts(counts, totalJobs);
    }, 0);
  }

  //ẩn hiện biểu đồ lúc lướt/scroll
  private _setupScrollBehavior(): void {
    const oChartContainer = this.byId("chartContainer");

    if (!oChartContainer) {
      console.warn("Chart container not found.");
      return;
    }

    const oDom = oChartContainer.getDomRef();
    if (!oDom) {
      console.warn("Chart DOM not found.");
      return;
    }

    let lastScrollTop = 0;

    window.addEventListener("scroll", () => {
      const currentScroll =
        window.scrollY || document.documentElement.scrollTop;

      if (currentScroll > 100 && oDom.style.display !== "none") {
        oDom.style.display = "none";
      } else if (currentScroll <= 100 && oDom.style.display === "none") {
        oDom.style.display = "block";
      }

      lastScrollTop = currentScroll;
    });
  }

  //scroll 2
  // Add this method to your ViewReport controller
  public onAfterRendering(): void {
    // Đợi DOM render xong
    jQuery.sap.delayedCall(500, this, () => {
      const oChartContainer = this.byId("chartContainer");
      const oSemanticPage = this.byId("page");

      if (!oChartContainer || !oSemanticPage) return;

      // Tìm container scroll thực sự
      const oScrollContainer = oSemanticPage
        .getDomRef()
        ?.querySelector(".sapFSemanticPageContent") as HTMLElement;

      if (!oScrollContainer) {
        console.error("Không tìm thấy vùng scroll");
        return;
      }

      let iLastScrollTop = 0;
      const iThreshold = 50; // Ngưỡng scroll để ẩn

      // Xử lý sự kiện scroll
      oScrollContainer.addEventListener("scroll", () => {
        const iCurrentScrollTop = oScrollContainer.scrollTop;

        // Ẩn khi cuộn xuống quá ngưỡng
        if (
          iCurrentScrollTop > iThreshold &&
          iCurrentScrollTop > iLastScrollTop
        ) {
          oChartContainer.$().addClass("hidden-chart");
        }
        // Hiện khi cuộn lên hoặc về đầu
        else {
          oChartContainer.$().removeClass("hidden-chart");
        }

        iLastScrollTop = iCurrentScrollTop;
      });
    });
  }

  // public onChartTabSelect(oEvent: sap.ui.base.Event): void {
  //   const sKey = oEvent.getParameter("key");
  //   const counts = this.getOwnerComponent()
  //     ?.getModel("jobModel")
  //     ?.getProperty("/counts");

  //   const totalJobs =
  //     counts.Scheduled +
  //     counts.Released +
  //     counts.Ready +
  //     counts.Active +
  //     counts.Running +
  //     counts.Canceled +
  //     counts.Finished;

  //   this._renderCharts(counts, totalJobs);
  // }
  public onChartTabSelect(oEvent: sap.ui.base.Event): void {
    const sKey = oEvent.getParameter("key"); // Lấy key từ sự kiện (tab1, tab2)
    console.log("Chart tab selected, key:", sKey);
  
    // Lấy jobModel
    const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    if (!oModel) {
      console.error("jobModel not found");
      return;
    }
  
    // KHÔNG cập nhật /selectedTab hoặc bộ lọc để giữ nguyên trạng thái lọc hiện tại
    // Chỉ làm mới biểu đồ
    setTimeout(() => {
      const counts = oModel.getProperty("/counts") || {};
      const totalJobs =
        counts.Scheduled +
        counts.Released +
        counts.Ready +
        counts.Active +
        counts.Running +
        counts.Canceled +
        counts.Finished;
  
      // Gọi _renderCharts với counts và totalJobs
      this._renderCharts(counts, totalJobs);
    }, 0);
  }


  private _chartKeyMap: Record<string, string> = {
    tab1: "Ready",
    tab2: "Scheduled",
    tab3: "Released",
    tab4: "Active",
    // Thêm các ánh xạ khác nếu cần
  };




  public onStatusTabSelect(oEvent: sap.ui.base.Event): void {
    const sKey = oEvent.getParameter("key");
    const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    oModel.setProperty("/selectedTab", sKey);

    const oTable = this.byId("jobTable") as sap.m.Table;
    const oBinding = oTable.getBinding("items");

    if (oBinding) {
      const aFilters = this._mFilters[sKey] || [];
      oBinding.filter(aFilters);
    }

    const oCounts = oModel.getProperty("/counts");
    if (oCounts) {
      const iCount = oCounts[sKey] ?? 0;
      const oBundle = this.getOwnerComponent()
        ?.getModel("i18n")
        ?.getResourceBundle();
      const sTitle = oBundle?.getText("JobsReportTableTitle", [iCount]);
      this.byId("jobTableToolbar").getContent()[0].setText(sTitle);
    }

    setTimeout(() => {
      const counts = oModel.getProperty("/counts");
      const totalJobs =
        counts.Scheduled +
        counts.Released +
        counts.Ready +
        counts.Active +
        counts.Running +
        counts.Canceled +
        counts.Finished;

      this._renderCharts(counts, totalJobs);
    }, 0);
  }

  public onUpdateFinished(oEvent: sap.ui.base.Event): void {
    console.log("onUpdateFinished called");
    const oViewModel = this.getOwnerComponent()?.getModel(
      "jobModel"
    ) as sap.ui.model.json.JSONModel;

    if (!oViewModel) {
      console.error("jobModel not found");
      return;
    }

    // Lấy dữ liệu từ jobModel
    const aData = oViewModel.getProperty("/ZG3_ET_UI5_01Set") || [];
    const oCounts = {
      All: aData.length,
      Scheduled: 0,
      Released: 0,
      Ready: 0,
      Active: 0,
      Running: 0,
      Canceled: 0,
      Finished: 0,
    };

    // Đếm số lượng bản ghi theo trạng thái
    aData.forEach((oItem: any) => {
      switch (oItem.Status) {
        case "P":
          oCounts.Scheduled++;
          break;
        case "S":
          oCounts.Released++;
          break;
        case "Y":
          oCounts.Ready++;
          break;
        case "Z":
          oCounts.Active++;
          break;
        case "R":
          oCounts.Running++;
          break;
        case "A":
          oCounts.Canceled++;
          break;
        case "F":
          oCounts.Finished++;
          break;
        default:
          break;
      }
    });

    console.log("====================================");

    // Tính tổng số jobs
    const totalJobs =
      oCounts.Scheduled +
      oCounts.Released +
      oCounts.Ready +
      oCounts.Active +
      oCounts.Running +
      oCounts.Canceled +
      oCounts.Finished;

    console.log("Total Jobs:", totalJobs); // In tổng số jobs ra console

    // Cập nhật lại counts trong jobModel
    oViewModel.setProperty("/counts", oCounts);
    console.log("Updated counts:", oCounts);

    this._renderCharts(oCounts, totalJobs);

    // Cập nhật tiêu đề động
    const oResourceBundle = this.getOwnerComponent()
      ?.getModel("i18n")
      ?.getResourceBundle();
    const sTitle = oResourceBundle?.getText("JobsReportTableTitle", [
      oCounts.all,
    ]);
    const oToolbar = this.getView().byId("jobTableToolbar") as sap.m.Toolbar;
    // const oHBox = oToolbar.getContent()[0] as sap.m.HBox; // Lấy HBox
    // const oTitle = oHBox.getItems()[0] as sap.m.Title; // Lấy Title trong HBox
    // oTitle.setText(sTitle); // Cập nhật tiêu đề
    this.getView().byId("jobTableToolbar").getContent()[0].setText(sTitle);

    // const oToolbar = this.getView().byId("jobTableToolbar") as sap.m.Toolbar;
    // const oHBox = oToolbar.getContent()[0] as sap.m.HBox; // Lấy HBox
    // const oTitle = oHBox.getItems()[0] as sap.m.Title; // Lấy Title bên trong HBox
    // oTitle.setText(sTitle);
  }

  public onPress(oEvent: sap.ui.base.Event): void {
    // Lấy item được click
    const oSelectedItem = oEvent.getSource() as sap.m.ColumnListItem;

    // Lấy context của item
    const oContext = oSelectedItem.getBindingContext("jobModel");

    if (oContext) {
      // Lấy ID của job từ context
      const sJobId = oContext.getProperty("Id");

      // Điều hướng đến màn hình chi tiết
      this.getOwnerComponent()?.getRouter().navTo("JobDetails", {
        jobId: sJobId,
      });
    } else {
      console.error("No binding context found for the selected item.");
    }
  }

  //
  private _renderCharts(counts: Record<string, number>, totalJobs: number): void {
    const Chart = (window as any).Chart;
    if (!Chart) {
      console.error("Chart.js not found");
      return;
    }
  
    // Kiểm tra và đăng ký chartjs-plugin-datalabels
    const ChartDataLabels = (window as any).ChartDataLabels;
    if (ChartDataLabels) {
      Chart.register(ChartDataLabels);
      console.log("chartjs-plugin-datalabels registered successfully");
    } else {
      console.warn("chartjs-plugin-datalabels is not loaded, datalabels will be disabled");
    }
  
    const labels = [
      "Scheduled",
      "Released",
      "Ready",
      "Active",
      "Running",
      "Canceled",
      "Finished",
    ];
  
    const data = [
      counts.Scheduled || 0,
      counts.Released || 0,
      counts.Ready || 0,
      counts.Active || 0,
      counts.Running || 0,
      counts.Canceled || 0,
      counts.Finished || 0,
    ];
  
    const totalData = labels.map(() => totalJobs);
  
    const backgroundColor = [
      "#3498db",
      "#8e44ad",
      "#27ae60",
      "#f1c40f",
      "#e67e22",
      "#e74c3c",
      "#2ecc71",
    ];
  
    const totalBackgroundColor = labels.map(() => "rgba(255, 105, 180, 1)");
  
    // Bar Chart
    const barCtx = document.getElementById("barChart") as HTMLCanvasElement;
    if (barCtx) {
      const existingBarChart = (Chart as any).getChart?.(barCtx.id);
      if (existingBarChart) existingBarChart.destroy();
  
      new Chart(barCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Jobs by Status",
              data: data,
              backgroundColor: backgroundColor,
            },
            {
              label: "Total Jobs",
              data: totalData,
              backgroundColor: totalBackgroundColor,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Job Status – Bar Chart",
              font: { size: 20 },
            },
            legend: { display: false, position: "top" },
          },
          scales: {
            x: { stacked: false },
            y: { beginAtZero: true },
          },
        },
      });
    } else {
      console.error("barChart canvas not found");
    }
  
    // Pie Chart
    const pieCtx = document.getElementById("pieChart") as HTMLCanvasElement;
    if (pieCtx) {
      const existingPieChart = (Chart as any).getChart?.(pieCtx.id);
      if (existingPieChart) existingPieChart.destroy();
  
      new Chart(pieCtx, {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: backgroundColor,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Job Status – Pie Chart",
              font: { size: 20 },
            },
            legend: { position: "top" },
          },
        },
      });
    } else {
      console.error("pieChart canvas not found");
    }
  }
}
