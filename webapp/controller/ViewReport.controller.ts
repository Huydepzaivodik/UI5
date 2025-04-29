import BaseController from "./Base.controller";
import formatter from "../model/formatter";
import Filter from "sap/ui/model/Filter"; // Import Filter từ đúng module
import FilterOperator from "sap/ui/model/FilterOperator"; // Import FilterOperator từ đúng module
import SearchField from "sap/m/SearchField"; // Import SearchField từ đúng module
import Event from "sap/ui/base/Event"; // Import Event từ đúng module
import { sap } from "sap/ui/core/library"; // Import sap từ đúng module
import JSONModel from "sap/ui/model/json/JSONModel";


export default class ViewReport extends BaseController {
  public formatter = formatter;
  // private _rowsPerPage = 100;
  private _rowsPerPage = 50;
  private _totalJobCount = 0;
  private _currentPage = 1;

  private _convertTabKeyToStatus(tabKey: string): string | undefined {
    const mapping: Record<string, string> = {
      Scheduled: "P",
      Released: "S",
      Ready: "Y",
      Active: "Z",
      Running: "R",
      Canceled: "A",
      Finished: "F",
    };
    return mapping[tabKey];
  }
  


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
    // this._mFilters = {
    //   All: [],
    //   Scheduled: [new Filter("Status", FilterOperator.EQ, "P")],
    //   Released: [new Filter("Status", FilterOperator.EQ, "S")],
    //   Ready: [new Filter("Status", FilterOperator.EQ, "Y")],
    //   Active: [new Filter("Status", FilterOperator.EQ, "Z")],
    //   Running: [new Filter("Status", FilterOperator.EQ, "R")],
    //   Canceled: [new Filter("Status", FilterOperator.EQ, "A")],
    //   Finished: [new Filter("Status", FilterOperator.EQ, "F")],
    // };
  
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
          console.log("Total jobbbbbbbb:",oData.results.job)
          const newCounts = this.processNewChartData(oData.results);
          oJSONModel.setProperty("/newCounts", newCounts);         
          this.renderNewChart(newCounts);
        },
        error: (err) => console.error("Lỗi load OData mới:", err)
      });
    }
  }
  


  

  public onSearch(oEvent?: sap.ui.base.Event): void {
    const oViewModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    const oModel = this.getOwnerComponent()?.getModel() as sap.ui.model.odata.v2.ODataModel;
    const oTable = this.byId("jobTable") as sap.m.Table;
    const oSearchField = this.byId("searchField") as sap.m.SearchField; // 👈 ID của ô search
  
    if (!oModel || !oViewModel || !oSearchField) {
      console.error("Model or SearchField not found");
      return;
    }
  
    let sQuery = oSearchField.getValue().trim(); // 👈 Lấy trực tiếp text search mới nhất
  
    // ✅ update lại viewModel luôn để đồng bộ
    oViewModel.setProperty("/searchText", sQuery);
  
    const statusFilter = oViewModel.getProperty("/activeStatusFilter") || "";
  
    const urlParams: Record<string, string> = {
      $top: this._rowsPerPage.toString(),
      $skip: "0",
    };
  
    let filters: string[] = [];
  
    if (statusFilter) {
      filters.push(`Status eq '${statusFilter}'`);
    }
    if (sQuery) {
      filters.push(`substringof('${sQuery}', Jobname)`);
    }
  
    if (filters.length > 0) {
      urlParams.$filter = filters.join(" and ");
      oViewModel.setProperty("/lastFilter", urlParams.$filter); // 🔥 lưu lại filter vào model
    } else {
      oViewModel.setProperty("/lastFilter", null); // 🔥 không có filter thì reset
    }

    oViewModel.setProperty("/_currentFilter", urlParams.$filter || "");
  
    const finalUrl = this._buildUrl("ZG3_ET_UI5_01Set", urlParams);
    console.log("📢 [onSearch] Final OData URL:", finalUrl);
  
    oModel.read("/ZG3_ET_UI5_01Set", {
      urlParameters: urlParams,
      success: (oData: { results: any[] }) => {
        oViewModel.setProperty("/pagedData", oData.results);
        oTable.getBinding("items")?.refresh(true);
        oViewModel.setProperty("/currentPage", 1);
  
        // Lấy lại count
        oModel.read("/ZG3_ET_UI5_01Set/$count", {
          urlParameters: { $filter: urlParams.$filter },
          success: (countData: any) => {
            const totalRecords = parseInt(countData, 10);
            const totalPages = Math.ceil(totalRecords / this._rowsPerPage);
            oViewModel.setProperty("/totalPages", totalPages);
            this._totalJobCount = totalRecords; // 👈 FIX: cập nhật lại totalJobCount sau search
            this._renderPagination();
          },
          error: (err) => console.error("Lỗi lấy tổng số bản ghi:", err),
        });
      },
      error: (err) => {
        sap.m.MessageToast.show("Lỗi khi tìm kiếm dữ liệu. Vui lòng thử lại!");
        console.error("Lỗi khi tìm kiếm:", err.responseText);
      },
    });
  }
  
  





  // Thêm hàm xử lý dữ liệu mới
  private processNewChartData(data: Array<{ Status: string; Jobcount: number }>): Record<string, number> {
    const result: Record<string, number> = {};  // Không cần phải khai báo các trạng thái từ trước, vì chúng sẽ được thêm tự động
    let total = 0;  // Biến để tính tổng job cho "All"
  
    data.forEach(item => {
      const count = typeof item.Jobcount === 'string' 
      ? parseInt(item.Jobcount.trim(), 10) 
      : item.Jobcount;
      
    result[item.Status] = count;
    total += count;
    });
    console.log("Total:====",total);
  result["All"] = total;
  result["Total"] = total; // Thêm trường Total
    return result;
  }
  
  

// Thêm hàm render biểu đồ mới
private renderNewChart(counts: Record<string, number>): void {
  const Chart = (window as any).Chart;
  const ctx = document.getElementById("newBarChart") as HTMLCanvasElement;

  if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

  const statusLabels = [
    { key: "P", label: "Scheduled", color: "#EB895F" },
    { key: "S", label: "Released",  color: "#E8D166" },
    { key: "Y", label: "Ready",     color: "#9071CE" },
    { key: "Z", label: "Active",    color: "#E669B9" },
    { key: "R", label: "Running",   color: "#41A4FF" },
    { key: "A", label: "Canceled",  color: "#D64550" },
    { key: "F", label: "Finished",  color: "#3ECB63" }
  ];

  const datasets = statusLabels.map((item, index) => ({
    label: item.label,
    data: statusLabels.map((_, i) => i === index ? (counts[item.key] || 0) : null),
    backgroundColor: item.color,
    stack: "statusStack"
  }));

  // Dataset tổng
  datasets.push({
    label: "All (Total Jobs)",
    data: Array(statusLabels.length).fill(counts["Total"] || 0),
    backgroundColor: "#CCCCCC",
    stack: "totalStack"
  });

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: statusLabels.map(s => s.label),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Job Status Chart",
          font: { size: 20 }
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: {
          stacked: true
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}







  
public onStatusTabSelect(oEvent: sap.ui.base.Event): void {
  const sKey = oEvent.getParameter("key");
  console.log("Status tab selected, key:", sKey);

  const oViewModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
  if (!oViewModel) {
    console.error("jobModel not found");
    return;
  }

  oViewModel.setProperty("/selectedTab", sKey);

  const statusCode = this._convertTabKeyToStatus(sKey);
  oViewModel.setProperty("/activeStatusFilter", statusCode || null);

  // 🛠 Fix: Sau khi đổi status filter, gọi search lại ngay
  this._searchWithCurrentCondition(); // Gọi lại search realtime, lấy searchText hiện tại
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
    const sKey = oEvent.getParameter("key");
    console.log("Chart tab selected, key:", sKey);
  
    const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    if (!oModel) {
      console.error("jobModel not found");
      return;
    }
  
    setTimeout(() => {
      if (sKey === "tab1" || sKey === "tab2") {
        const counts = oModel.getProperty("/counts") || {};
        const totalJobs =
          counts.Scheduled +
          counts.Released +
          counts.Ready +
          counts.Active +
          counts.Running +
          counts.Canceled +
          counts.Finished;
        this._renderCharts(counts, totalJobs);
      } else if (sKey === "tab3") {
        const newCounts = oModel.getProperty("/newCounts") || {};
        this.renderNewChart(newCounts);
      }
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
    console.log("Status tab selected, key:", sKey);
  
    const oViewModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
    if (!oViewModel) {
      console.error("jobModel not found");
      return;
    }
  
    oViewModel.setProperty("/selectedTab", sKey);
  
    const statusCode = this._convertTabKeyToStatus(sKey);
    oViewModel.setProperty("/activeStatusFilter", statusCode || null);
  
    // ✅ GỌI TRỐNG không fake event nữa
    this.onSearch();
  
    // Update dynamic title (optional)
    const newCounts = oViewModel.getProperty("/newCounts");
    if (newCounts) {
      const iCount = statusCode ? (newCounts[statusCode] ?? 0) : (newCounts["All"] ?? 0);
      const oBundle = this.getOwnerComponent()
        ?.getModel("i18n")
        ?.getResourceBundle();
      const sTitle = oBundle?.getText("JobsReportTableTitle", [iCount]) || `Jobs (${iCount})`;
      const oToolbar = this.byId("jobTableToolbar") as sap.m.Toolbar;
      oToolbar.getContent()[0].setText(sTitle);
    }
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
    console.log("aData:", aData); // In counts ra console
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
              label: "Total delayed jobs",
              data: delayCounts,
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
              yAxisID: "y1",
            },
            {
              type: "line",
              label: "Total delay time (s)",
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
                  if (context.dataset.label === "Total delayed jobs") {
                    return `Total delayed jobs: ${tooltipDelayCounts[context.dataIndex]}`;
                  } else if (context.dataset.label === "Total delay time (s)") {
                    return `Job count: ${tooltipJobCounts[context.dataIndex]} | Job name: ${tooltipJobNames[context.dataIndex]} | Max delay: ${tooltipMaxDelays[context.dataIndex]}s`;
                  }
                  return context.raw;
                }
              }
            },
            title: {
              display: true,
              text: "Job Delays Chart - Last 24 Hours",
              font: { size: 20 },
            },
          },
          scales: {
            x: {
              title: { display: true, text: "Time frame" },
            },
            y1: {
              type: "linear",
              position: "left",
              title: { display: true, text: "Total delayed jobs" },
            },
            y2: {
              type: "linear",
              position: "right",
              title: { display: true, text: "Total delay time (s)" },
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

  const currentFilter = oViewModel.getProperty("/_currentFilter") || "";

  const skip = (page - 1) * this._rowsPerPage;
  const urlParams: Record<string, string> = {
    $top: this._rowsPerPage.toString(),
    $skip: skip.toString(),
  };

  if (currentFilter) {
    urlParams.$filter = currentFilter;
  }

  console.log("[_loadPage] Real URL:", this._buildUrl("ZG3_ET_UI5_01Set", urlParams));

  // 👉 Đọc dữ liệu
  oModel.read("/ZG3_ET_UI5_01Set", {
    urlParameters: urlParams,
    success: (oData: { results: any[] }) => {
      oViewModel.setProperty("/pagedData", oData.results);

      const oTable = this.byId("jobTable") as sap.m.Table;
      oTable.getBinding("items")?.refresh(true);

      oViewModel.setProperty("/currentPage", page);

      // ✅ Sau khi fetch thành công, đọc thêm COUNT
      const countParams: Record<string, string> = {};
      if (currentFilter) {
        countParams.$filter = currentFilter;
      }

      oModel.read("/ZG3_ET_UI5_01Set/$count", {
        urlParameters: countParams,
        success: (countData: any) => {
          const totalRecords = parseInt(countData, 10);
          const totalPages = Math.ceil(totalRecords / this._rowsPerPage);
          oViewModel.setProperty("/totalPages", totalPages);
          this._totalJobCount = totalRecords;
          this._renderPagination();
        },
        error: (err) => console.error("Lỗi count paging:", err)
      });
    },
    error: (err) => console.error("Lỗi load page:", err)
  });
}




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


private _searchWithCurrentCondition(): void {
  const oViewModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
  const oModel = this.getOwnerComponent()?.getModel() as sap.ui.model.odata.v2.ODataModel;
  const oTable = this.byId("jobTable") as sap.m.Table;
  const oSearchField = this.byId("searchField") as sap.m.SearchField;

  if (!oModel || !oViewModel || !oTable || !oSearchField) {
    console.error("Missing model or table or search field");
    return;
  }

  const sQuery = oSearchField.getValue().trim();
  const statusFilter = oViewModel.getProperty("/activeStatusFilter") || "";

  let filters: string[] = [];
  if (statusFilter) filters.push(`Status eq '${statusFilter}'`);
  if (sQuery) filters.push(`substringof('${sQuery}', Jobname)`);

  const urlParams: Record<string, string> = {
    $top: this._rowsPerPage.toString(),
    $skip: "0",
  };
  
  if (filters.length > 0) {
    urlParams.$filter = filters.join(" and ");

  oViewModel.setProperty("/lastFilter", urlParams.$filter); // 🔥
  } else {
    oViewModel.setProperty("/lastFilter", null);
  }

  oViewModel.setProperty("/_currentFilter", urlParams.$filter || "");

  console.log("[_searchWithCurrentCondition] Final URL:", this._buildUrl("ZG3_ET_UI5_01Set", urlParams));

  oModel.read("/ZG3_ET_UI5_01Set", {
    urlParameters: urlParams,
    success: (oData: { results: any[] }) => {
      oViewModel.setProperty("/pagedData", oData.results);
      oTable.getBinding("items")?.refresh(true);
      oViewModel.setProperty("/currentPage", 1);

      // 💥 Luôn fetch lại $count, không quan tâm filter hay không
      const countParams: Record<string, string> = {};
      if (filters.length > 0) {
        countParams.$filter = filters.join(" and ");

      }
      oViewModel.setProperty("/_currentFilter", urlParams.$filter || "");  
      oModel.read("/ZG3_ET_UI5_01Set/$count", {
        urlParameters: countParams,
        success: (countData: any) => {
          const totalRecords = parseInt(countData, 10);
          const totalPages = Math.ceil(totalRecords / this._rowsPerPage);
          oViewModel.setProperty("/totalPages", totalPages);
          this._totalJobCount = totalRecords;
          this._renderPagination();
        },
        error: (err) => console.error("Lỗi lấy count sau search:", err)
      });
    },
    error: (err) => console.error("Lỗi search data:", err)
  });
}


private _searchTimeout: any = null; // Thêm 1 biến timeout để debounce

public onLiveChange(oEvent: sap.ui.base.Event): void {
  if (this._searchTimeout) {
    clearTimeout(this._searchTimeout);
  }

  // Đợi 300ms sau khi user ngừng gõ mới thực sự search
  this._searchTimeout = setTimeout(() => {
    this._searchWithCurrentCondition();
  }, 300);
}





//console vip pro by BACH
private _buildUrl(entitySet: string, urlParams: Record<string, string>): string {
  const queryString = Object.entries(urlParams)
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
    .join("&");
  return `/sap/opu/odata/SAP/ZG3_SEGW_DB_UI5_01_SRV/${entitySet}?${queryString}`;
}


// 👇 ĐỪNG QUÊN ĐÓNG CLASS
}
