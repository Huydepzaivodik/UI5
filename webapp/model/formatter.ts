export default {
  
  formatPageInfo(currentPage: number, totalPages: number): string {
    return `Page ${currentPage} of ${totalPages}`;
  },

  formatTime: function (oTime: any): string {
    if (!oTime) return "N/A";

    if (typeof oTime === "object" && oTime.ms !== undefined) {
      const totalSeconds = Math.floor(oTime.ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    return "N/A";
  },
  formatDate: function (oDate: any): string {
    if (!oDate || !(oDate instanceof Date)) return "N/A";

    const day = oDate.getDate().toString().padStart(2, "0");
    const month = (oDate.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
    const year = oDate.getFullYear();

    return `${day}/${month}/${year}`;
  },

  dynamicTitle: function(selectedTab, counts) {
    if (!counts || !selectedTab) return "";
  
    const keyToStatus = {
      Scheduled: "P",
      Released: "S",
      Ready: "Y",
      Active: "Z",
      Running: "R",
      Canceled: "A",
      Finished: "F",
      All: "All"
    };
  
    const statusKey = keyToStatus[selectedTab] || selectedTab;
    const count = counts[statusKey] || 0;
  
    return `Jobs (${count})`;
  },

  getStatusIcon: function (sStatus: string): string {
    switch (sStatus) {
      case "F":
        return "sap-icon://complete"; // Finished
      case "P":
        return "sap-icon://appointment"; // Scheduled
      case "S":
        return "sap-icon://paper-plane"; // Released
      case "Y":
        return "sap-icon://accept"; // Ready
      case "Z":
        return "sap-icon://activity-items"; // Active
      case "R":
        return "sap-icon://process"; // Running
      case "A":
        return "sap-icon://decline"; // Aborted
      default:
        return "sap-icon://question-mark"; // Unknown
    }
  },

  getStatusColor: function (sStatus: string): string {
    switch (sStatus) {
      case "F":
        return "green"; // Finished
      case "P":
        return "orange"; // Scheduled
      case "S":
        return "blue"; // Released
      case "Y":
        return "teal"; // Ready
      case "Z":
        return "green"; // Active
      case "R":
        return "yellow"; // Running
      case "A":
        return "red"; // Aborted
      default:
        return "gray"; // Unknown
    }
  },

  getStatusText: function (sStatus: string): string {
    switch (sStatus) {
      case "F":
        return "Finished";
      case "P":
        return "Scheduled";
      case "S":
        return "Released";
      case "Y":
        return "Ready";
      case "Z":
        return "Active";
      case "R":
        return "Running";
      case "A":
        return "Aborted";
      default:
        return "Unknown";
    }
  }


  
};

