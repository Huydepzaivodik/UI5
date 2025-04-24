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
    // 1. Khởi tạo jobModel
    const oJSONModel = new JSONModel({
        counts: { 
            All: 0, 
            Scheduled: 0, 
            Released: 0, 
            Ready: 0, 
            Active: 0, 
            Running: 0, 
            Canceled: 0, 
            Finished: 0 
        },
        newCounts: {}, // Thêm property cho dữ liệu mới
        selectedTab: "All",
        ZG3_ET_UI5_01Set: []
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

    // 3. Load data từ OData CŨ (mainService)
    const oMainModel = this.getOwnerComponent()?.getModel() as sap.ui.model.odata.v2.ODataModel;
    if (oMainModel) {
        oMainModel.read("/ZG3_ET_UI5_01Set", {
            success: (oData: { results: any[] }) => {
                oJSONModel.setProperty("/ZG3_ET_UI5_01Set", oData.results);
            },
            error: (err: any) => console.error("Lỗi load OData cũ:", err)
        });
    }

    // 4. Load data từ OData MỚI (serviceC1Model)
    const oServiceC1Model = this.getOwnerComponent()?.getModel("serviceC1Model") as sap.ui.model.odata.v2.ODataModel;
    if (oServiceC1Model) {
        oServiceC1Model.read("/ZG3_ET_UI5_C1Set", {
            success: (oData: { results: Array<{ Status: string; Jobcount: number }> }) => {
                const newCounts = this.processNewChartData(oData.results);
                oJSONModel.setProperty("/newCounts", newCounts);
                this.renderNewChart(newCounts);
            },
            error: (err: any) => console.error("Lỗi load OData mới:", err)
        });
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
      "#AAC4FF",
      "#FF9D76",
      "#FCDDB0",
      "#FF9D76",
      "#FCDDB0",
      "#6E85B7",
      "#68A7AD",
    ];

    const totalBackgroundColor = labels.map(() => "#AAAAAA");

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

    // Biểu đồ thứ 2 - Sửa theo yêu cầu mới
    const newChartCtx = document.getElementById("newChart") as HTMLCanvasElement;
    if (newChartCtx) {
      const existingNewChart = (Chart as any).getChart?.(newChartCtx.id);
      if (existingNewChart) existingNewChart.destroy();

      // Lấy data từ model
      const oModel = this.getOwnerComponent()?.getModel("jobModel") as JSONModel;
      const aJobs: any[] = oModel.getProperty("/ZG3_ET_UI5_01Set") || [];

      // Tìm job gần nhất có Delay > 0

      let latestJob: any = null;
      aJobs.forEach((job) => {
        if (job.Delay > 0) {
          const jobStart = this._parseJobDateTime(job.Strtdate, job.Strttime);
          console.log("Job Start Time:", jobStart); // In ra thời gian bắt đầu job
          if (!jobStart) return;

          if (!latestJob || jobStart > latestJob.startTime) {
            latestJob = {
              startTime: jobStart,
              jobData: job
            };
          }
        }
      });

      // Xác định startTime và endTime dựa trên job gần nhất
      let endTime: Date, startTime: Date;
      if (latestJob) {
        endTime = latestJob.startTime;
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      } else {
        // Nếu không có job nào, mặc định dùng thời gian hiện tại
        endTime = new Date();
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      }

      // Tạo 24 khung giờ
      const timeSlots: Array<{
        start: Date;
        end: Date;
        jobs: any[];
        totalDelay: number;
        maxDelayJob: any;
      }> = [];

      // Điều chỉnh để khung đầu tiên bắt đầu từ startTime chính xác
      for (let i = 0; i < 24; i++) {
        const slotStart = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        timeSlots.push({
          start: slotStart,
          end: slotEnd,
          jobs: [],
          totalDelay: 0,
          maxDelayJob: null,
        });
      }

      // Lọc và phân loại job vào các khung
      aJobs.forEach((job) => {
        const delay = parseInt(job.Delay, 10); // Chuyển đổi Delay từ chuỗi sang số
        if (isNaN(delay) || delay <= 0) return; // Bỏ qua nếu Delay không hợp lệ hoặc <= 0

        const jobStart = this._parseJobDateTime(job.Strtdate, job.Strttime);
        if (!jobStart) return;

        // Chỉ xử lý job trong khoảng [startTime, endTime]
        if (jobStart < startTime || jobStart >= endTime) return;

        const slot = timeSlots.find(
          (s) => jobStart >= s.start && jobStart < s.end
        );
        if (slot) {
          slot.jobs.push(job);
          slot.totalDelay += delay; // Sử dụng giá trị delay đã chuyển đổi

          if (!slot.maxDelayJob || delay > slot.maxDelayJob.Delay) {
            slot.maxDelayJob = job;
          }
        }
      });
      // Tạo labels cho khung giờ
      const timeLabels = timeSlots.map((s) => {
        const startHour = s.start.getHours().toString().padStart(2, '0');
        const endHour = s.end.getHours().toString().padStart(2, '0');
        return `${startHour}h - ${endHour}h`;
      });

      const delayCounts = timeSlots.map(s => s.jobs.length);
      const delayDurations = timeSlots.map(s => s.totalDelay);
      const delayTooltips = timeSlots.map(s =>
        s.maxDelayJob
          ? `${s.maxDelayJob.Jobname}: ${parseInt(s.maxDelayJob.Delay, 10)}s`
          : 'No delayed jobs'
      );

      // Tạo biểu đồ
      new Chart(newChartCtx, {
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
              label: "Thời gian delay (giây)",
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
                  if (context.dataset.type === "line") {
                    return delayTooltips[context.dataIndex];
                  }
                  return `${context.dataset.label}: ${context.raw}`;
                },
              },
            },
            title: {
              display: true,
              text: "Biểu đồ jobs bị delay trong 24 giờ gần nhất",
              font: { size: 20 },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "Khung giờ",
              },
            },
            y1: {
              type: "linear",
              position: "left",
              title: {
                display: true,
                text: "Số lượng jobs bị delay",
              },
            },
            y2: {
              type: "linear",
              position: "right",
              title: {
                display: true,
                text: "Thời gian delay (giây)",
              },
              grid: {
                drawOnChartArea: false, // Không vẽ lưới trên trục y2
              },
            },
          },
        },
      });
    } else {
      console.error("newChart canvas not found");
    }
  }

  // Hàm hỗ trợ chuyển đổi datetime
  private _parseJobDateTime(dateStr: string, timeStr: string | null): Date | null {
    try {
      // Kiểm tra định dạng ngày (YYYY-MM-DD)
      const dateParts = dateStr.split("-");
      if (dateParts.length !== 3) {
        console.error("Invalid date format:", dateStr);
        return null;
      }
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-based
      const day = parseInt(dateParts[2], 10);

      // Kiểm tra định dạng giờ (HH:mm:ss)
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

      // Tạo Date object theo LOCAL TIME
      return new Date(year, month, day, hours, minutes, seconds);
    } catch (e) {
      console.error("Error parsing job datetime:", e, { dateStr, timeStr });
      return null;
    }
  }
}
