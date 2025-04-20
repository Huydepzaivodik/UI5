import BaseController from "./Base.controller";
import formatter from "../model/formatter";
import Filter from "sap/ui/model/Filter"; // Import Filter từ đúng module
import FilterOperator from "sap/ui/model/FilterOperator"; // Import FilterOperator từ đúng module
import SearchField from "sap/m/SearchField"; // Import SearchField từ đúng module
import Event from "sap/ui/base/Event"; // Import Event từ đúng module
import { sap } from "sap/ui/core/library"; // Import sap từ đúng module
import JSONModel from "sap/ui/model/json/JSONModel";
//hehe
//kimochi o o
// u i a
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
      ZG3_ET_UI5Set: [],
    });

    this.getOwnerComponent()?.setModel(oJSONModel, "jobModel");
    oModel.read("/ZG3_ET_UI5Set", {
      success: (oData: { results: any[] }) => {
        console.log("Data loaded successfully", oData.results);

        // Gắn dữ liệu vào jobModel
        const oJSONModel = this.getOwnerComponent()?.getModel(
          "jobModel"
        ) as sap.ui.model.json.JSONModel;
        if (oJSONModel) {
          oJSONModel.setProperty("/ZG3_ET_UI5Set", oData.results);
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
  public onIconTabSelect(oEvent: sap.ui.base.Event): void {
    const sSelectedKey = oEvent.getParameter("key");
    console.log("Selected key:", sSelectedKey);

    const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    oModel.setProperty("/selectedTab", sSelectedKey);

    const oTable = this.byId("jobTable") as sap.m.Table;
    const oBinding = oTable?.getBinding("items");

    if (oBinding) {
      const aFilters =
        sSelectedKey === "all" ? [] : this._mFilters[sSelectedKey];
      oBinding.filter(aFilters);
    }

    // 🔁 Khôi phục phần cập nhật tiêu đề bảng
    const oViewModel = oModel;
    if (oViewModel) {
      const oCounts = oViewModel.getProperty("/counts");
      const iCount =
        sSelectedKey === "all" ? oCounts.All : oCounts[sSelectedKey];
      const oResourceBundle = this.getOwnerComponent()
        ?.getModel("i18n")
        ?.getResourceBundle();
      const sTitle = oResourceBundle?.getText("JobsReportTableTitle", [iCount]);
      this.getView().byId("jobTableToolbar").getContent()[0].setText(sTitle);
    }

    // ✅ Gọi lại biểu đồ sau khi tab đổi
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

  public onChartTabSelect(oEvent: sap.ui.base.Event): void {
    const sKey = oEvent.getParameter("key");
    const counts = this.getOwnerComponent()
      ?.getModel("jobModel")
      ?.getProperty("/counts");

    const totalJobs =
      counts.Scheduled +
      counts.Released +
      counts.Ready +
      counts.Active +
      counts.Running +
      counts.Canceled +
      counts.Finished;

    this._renderCharts(counts, totalJobs);
  }

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
    const aData = oViewModel.getProperty("/ZG3_ET_UI5Set") || [];
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
  private _renderCharts(
    counts: Record<string, number>,
    totalJobs: Number
  ): void {
    const Chart = (window as any).Chart;
    if (!Chart) return;

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
      counts.Scheduled,
      counts.Released,
      counts.Ready,
      counts.Active,
      counts.Running,
      counts.Canceled,
      counts.Finished,
    ];

    const totalData = [];
    for (let i = 0; i < labels.length; i++) {
      totalData.push(totalJobs);
    }

    const backgroundColor = [
      "#3498db",
      "#8e44ad",
      "#27ae60",
      "#f1c40f",
      "#e67e22",
      "#e74c3c",
      "#2ecc71",
    ];

    const totalBackgroundColor = [
      "rgba(255, 105, 180, 1)", // Màu hồng đậm
      "rgba(255, 105, 180, 1)",
      "rgba(255, 105, 180, 1)",
      "rgba(255, 105, 180, 01)",
      "rgba(255, 105, 180, 1)",
      "rgba(255, 105, 180, 1)",
      "rgba(255, 105, 180, 1)"
    ];
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
              data:data,
              backgroundColor,
            },
            {
              label: "Total Jobs",
              data: totalData, // Giá trị totalJobs cho mỗi cột
              backgroundColor: totalBackgroundColor
          }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Job Status – Bar Chart",
              font: {
                size: 20, // chỉnh to lên (ví dụ: 20px)
              },
            },
            legend: { display: false },
          },
          scales: {
            x: {
                stacked: false // Hiển thị các cột liền cạnh
            },
            y: {
                beginAtZero: true
            }
        } 
        },
      });
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
              backgroundColor,
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
              font: {
                size: 20, // chỉnh to lên (ví dụ: 20px)
              },
            },
            legend: { position: "top" },
          },
        },
      });
    }
  }
}
