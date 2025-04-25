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
  // private _rowsPerPage = 100;
  private _rowsPerPage = 50;
  private _totalJobCount = 0;
  private _currentPage = 1;


  public onInit(): void {
    // 1. Khởi tạo jobModel với currentPage và totalPages
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
    newCounts: {},
    selectedTab: "All",
    ZG3_ET_UI5_01Set: [],
    pagedData: [],
    currentPage: 1, // Thêm trường này
    totalPages: 0   // Thêm trường này
  });
  this.getOwnerComponent()?.setModel(oJSONModel, "jobModel");
  
    // 2. Khởi tạo bộ lọc
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
  
    // 3. Lấy tổng số job để tính số trang
    const oMainModel = this.getOwnerComponent()?.getModel() as sap.ui.model.odata.v2.ODataModel;
    if (oMainModel) {
      oMainModel.read("/ZG3_ET_UI5_01Set/$count", {
        success: (oData: any) => {
          oJSONModel.setProperty("/pagedData", oData.results);
          this._totalJobCount = parseInt(oData, 10);
          this._loadPage(1); // Quan trọng: Sau khi lấy count -> load luôn trang 1
        },
        error: (err) => console.error("Lỗi lấy tổng job:", err)
      });
    }
  
    // 4. Load dữ liệu từ serviceC1Model (cho chart)
    const oServiceC1Model = this.getOwnerComponent()?.getModel("serviceC1Model") as sap.ui.model.odata.v2.ODataModel;
    if (oServiceC1Model) {
      oServiceC1Model.read("/ZG3_ET_UI5_C1Set", {
        success: (oData: { results: Array<{ Status: string; Jobcount: number }> }) => {
          const newCounts = this.processNewChartData(oData.results);
          oJSONModel.setProperty("/newCounts", newCounts);
          this.renderNewChart(newCounts);
        },
        error: (err) => console.error("Lỗi load OData mới:", err)
      });
    }
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




  // Thêm hàm xử lý dữ liệu mới
private processNewChartData(data: Array<{ Status: string; Jobcount: number }>): Record<string, number> {
  const result: Record<string, number> = {};
  data.forEach(item => result[item.Status] = item.Jobcount);
  return result;
}

// Thêm hàm render biểu đồ mới
private renderNewChart(counts: Record<string, number>): void {
  const Chart = (window as any).Chart;
  const ctx = document.getElementById("newBarChart") as HTMLCanvasElement;

  if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(counts),
      datasets: [{
        label: "Job Count (from new OData)",
        data: Object.values(counts),
        backgroundColor: "#2196F3"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Chart from new OData" }
      }
    }
  });
}

  
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

     // Xử lý tab biểu đồ mới
    if (sSelectedKey === "tab3") {
      const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
      const newCounts = oModel.getProperty("/newCounts") || {};
      this.renderNewChart(newCounts);
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



  private _newChartInstance: any;

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

  const labels = ["Scheduled", "Released", "Ready", "Active", "Running", "Canceled", "Finished"];
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
    "#AAC4FF", "#FF9D76", "#FCDDB0", "#FF9D76", "#FCDDB0", "#6E85B7", "#68A7AD"
  ];
  const totalBackgroundColor = labels.map(() => "#AAAAAA");

  const barCtx = document.getElementById("barChart") as HTMLCanvasElement;
  if (barCtx) {
    const existingBarChart = (Chart as any).getChart?.(barCtx.id);
    if (existingBarChart) existingBarChart.destroy();

    new Chart(barCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Jobs by Status", data: data, backgroundColor: backgroundColor },
          { label: "Total Jobs", data: totalData, backgroundColor: totalBackgroundColor },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: "Job Status – Bar Chart", font: { size: 20 } },
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

  // === BIỂU ĐỒ TỪ ODATA C3 ===
  const newChartCtx = document.getElementById("newChart") as HTMLCanvasElement;
  if (!newChartCtx) {
    console.error("Không tìm thấy canvas newChart");
    return;
  }

  if (this._newChartInstance) {
    this._newChartInstance.destroy();
  }

  const oServiceC3Model = this.getOwnerComponent()?.getModel("serviceC3Model") as sap.ui.model.odata.v2.ODataModel;
  if (!oServiceC3Model) {
    console.error("Model serviceC3Model không tồn tại");
    return;
  }

  oServiceC3Model.read("/ZG3_ET_UI5_C3Set", {
    success: (oData: { results: any[] }) => {
      console.log("✅ OData C3 Results:", oData.results);
      const aData = oData.results || [];

      const timeLabels = aData.map(d => d.Timeframe.trim());
      const delayCounts = aData.map(d => parseInt(d.Jobdelaycountbytimeframe.trim(), 10));
      const delayDurations = aData.map(d => parseInt(d.Sumdelaycountbytimeframe.trim(), 10));
      // const delayTooltips = aData.map(d =>
      //   `Job: ${d.Jobnamebytooltip?.trim() || "N/A"} | Delay: ${d.Sumdelaycountbytimeframe.trim()}s | Job Count: ${d.Jobdelaycountbytimeframe.trim()}`
      // );
      const tooltipDelayCounts = aData.map(d => parseInt(d.Jobdelaycountbytimeframe.trim(), 10)); // Bar
      const tooltipJobCounts   = aData.map(d => d.Jobcountfortooltip?.trim() || "");              // Line
      const tooltipJobNames = aData.map(d => d.Jobnamebytooltip?.trim() || "N/A");               // Line
      const tooltipMaxDelays   = aData.map(d => d.Maxdelaytimebytimeframe?.trim() || "");         // Line
      


      this._newChartInstance = new Chart(newChartCtx, {
        type: "bar",
        data: {
          labels: timeLabels,
          datasets: [
            {
              type: "bar",
              label: "Số lượng jobs bị delay",
              data: delayCounts,
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
              yAxisID: "y1",
            },
            {
              type: "line",
              label: "Tổng thời gian delay (giây)",
              data: delayDurations,
              borderColor: "rgba(255, 99, 132, 1)",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              fill: false,
              tension: 0.4,
              yAxisID: "y2",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  if (context.dataset.label === "Số lượng jobs bị delay") {
                    return `Số lượng job delay: ${tooltipDelayCounts[context.dataIndex]}`;
                  } else if (context.dataset.label === "Tổng thời gian delay (giây)") {
                    return `Job count: ${tooltipJobCounts[context.dataIndex]} | Job name: ${tooltipJobNames[context.dataIndex]} | Max delay: ${tooltipMaxDelays[context.dataIndex]}s`;
                  }
                  return context.raw;
                }
              }
            },
            title: {
              display: true,
              text: "Biểu đồ jobs bị delay trong 24 giờ gần nhất (từ OData C3)",
              font: { size: 20 },
            },
          },
          scales: {
            x: {
              title: { display: true, text: "Khung giờ" },
            },
            y1: {
              type: "linear",
              position: "left",
              title: { display: true, text: "Số lượng jobs bị delay" },
            },
            y2: {
              type: "linear",
              position: "right",
              title: { display: true, text: "Tổng thời gian delay (giây)" },
              grid: { drawOnChartArea: false },
            },
          },
        },
      });
    },
    error: (err) => {
      console.error("Lỗi khi đọc dữ liệu từ OData C3:", err);
    },
  });
}

private _parseJobDateTime(dateStr: string, timeStr: string | null): Date | null {
  try {
    const dateParts = dateStr.split("-");
    if (dateParts.length !== 3) {
      console.error("Invalid date format:", dateStr);
      return null;
    }
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    let hours = 0, minutes = 0, seconds = 0;
    if (timeStr) {
      const timeParts = timeStr.split(":");
      if (timeParts.length !== 3) {
        console.error("Invalid time format:", timeStr);
        return null;
      }
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
      seconds = parseInt(timeParts[2], 10);
    }

    return new Date(year, month, day, hours, minutes, seconds);
  } catch (e) {
    console.error("Error parsing job datetime:", e, { dateStr, timeStr });
    return null;
  }
}




private _loadPage(page: number): void {
  const oModel = this.getOwnerComponent()?.getModel() as sap.ui.model.odata.v2.ODataModel;
  const oViewModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;

  // Tính toán totalPages
  const totalPages = Math.ceil(this._totalJobCount / this._rowsPerPage);
  oViewModel.setProperty("/totalPages", totalPages); // Cập nhật totalPages

  const skip = (page - 1) * this._rowsPerPage;
  
  oModel.read("/ZG3_ET_UI5_01Set", {
    urlParameters: {
      $skip: skip.toString(),
      $top: this._rowsPerPage.toString(),
    },
    success: (oData: { results: any[] }) => {
      oViewModel.setProperty("/pagedData", oData.results);
      oViewModel.setProperty("/currentPage", page);
      this._renderPagination(); // Gọi render pagination
    },
    error: (err) => console.error("Lỗi khi phân trang:", err)
  });
}


// private _renderPagination(): void {
//   const oContainer = this.byId("paginationContainer") as sap.m.HBox;
//   oContainer.removeAllItems();

//   const totalPages = Math.ceil(this._totalJobCount / this._rowsPerPage);
//   console.log("Tổng số trang:", totalPages);

//   const maxVisiblePages = 10; // Số nút phân trang hiển thị tối đa
//   const startPage = Math.max(1, this._currentPage - Math.floor(maxVisiblePages / 2));
//   const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

//   // Nút "Previous"
//   if (this._currentPage > 1) {
//     const oPrevButton = new sap.m.Button({
//       text: "Previous",
//       press: () => this._loadPage(this._currentPage - 1),
//     });
//     oContainer.addItem(oPrevButton);
//   }

//   // Tạo các nút phân trang
//   for (let i = startPage; i <= endPage; i++) {
//     console.log(`Tạo nút phân trang cho trang ${i}`);
//     const oButton = new sap.m.Button({
//       text: i.toString(),
//       type: i === this._currentPage ? "Emphasized" : "Default",
//       press: () => this._loadPage(i),
//     });
//     oContainer.addItem(oButton);
//   }

//   // Nút "Next"
//   if (this._currentPage < totalPages) {
//     const oNextButton = new sap.m.Button({
//       text: "Next",
//       press: () => this._loadPage(this._currentPage + 1),
//     });
//     oContainer.addItem(oNextButton);
//   }
// }
private _renderPagination(): void {
  const oContainer = this.byId("paginationContainer") as sap.m.HBox;
  if (!oContainer) {
      console.error("Pagination container not found!");
      return;
  }

  // Clear old buttons
  oContainer.destroyItems();

  // Calculate total pages
  const totalPages = Math.ceil(this._totalJobCount / this._rowsPerPage);
  if (totalPages <= 1) return; // No need pagination

  // Config
  const maxVisiblePages = 5; // Số trang hiển thị tối đa
  let startPage = Math.max(1, this._currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

  // Adjust if not enough pages
  if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Previous Button
  if (this._currentPage > 1) {
      oContainer.addItem(
          new sap.m.Button({
              icon: "sap-icon://slim-arrow-left",
              tooltip: "Previous Page",
              press: () => this._loadPage(this._currentPage - 1)
          })
      );
  }

  // Page Numbers
  for (let i = startPage; i <= endPage; i++) {
      oContainer.addItem(
          new sap.m.Button({
              text: i.toString(),
              type: i === this._currentPage ? "Emphasized" : "Transparent",
              press: () => {
                  if (i !== this._currentPage) {
                      this._loadPage(i);
                  }
              }
          }).addStyleClass("sapUiTinyMarginBeginEnd")
      );
  }

  // Next Button
  if (this._currentPage < totalPages) {
      oContainer.addItem(
          new sap.m.Button({
              icon: "sap-icon://slim-arrow-right",
              tooltip: "Next Page",
              press: () => this._loadPage(this._currentPage + 1)
          })
      );
  }

  // First/Last Buttons for large datasets
  if (totalPages > maxVisiblePages) {
      oContainer.insertItem(
          new sap.m.Button({
              text: "1",
              press: () => this._loadPage(1)
          }),
          0
      );

      oContainer.addItem(
          new sap.m.Button({
              text: totalPages.toString(),
              press: () => this._loadPage(totalPages)
          })
      );
  }
}


public onPreviousPage(): void {
  const current = this.getModel("jobModel").getProperty("/currentPage");
  this._loadPage(current - 1);
}

public onNextPage(): void {
  const current = this.getModel("jobModel").getProperty("/currentPage");
  this._loadPage(current + 1);
}

// 👇 ĐỪNG QUÊN ĐÓNG CLASS
}
