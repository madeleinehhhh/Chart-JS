class TableChart {
  constructor(tableId) {
    this.tableId = tableId;
    this.table = document.getElementById(tableId);
    this.chartId = `${tableId}-canvasjs`;
    this.labels = [];
    this.datasets = [];

    if (!this.table) {
      console.error(`Table with ID "${tableId}" not found.`);
      return;
    }

    this.chartType = this.table.dataset.chartType;
    if (!this.chartType) {
      console.error(`No data-chart-type attribute found on table with ID "${tableId}".`);
      return;
    }

    this.prepareChart();
  }

  prepareChart() {
    this.parseTable();
    this.makeTableAccessible();
    this.table.style.display = "none";
    this.insertCanvas();
    this.renderChart();
  }

  parseTable() {
    const thead = this.table.querySelector("thead");
    const tbody = this.table.querySelector("tbody");

    if (!thead || !tbody) {
      console.error(`Table with ID "${this.tableId}" must have both <thead> and <tbody>.`);
      return;
    }

    const headerCells = Array.from(thead.querySelectorAll("th"));
    const headers = headerCells.map((th) => th.textContent.trim());

    if (["stacked", "grouped"].includes(this.chartType)) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      this.labels = rows.map((row) => {
        const th = row.querySelector("th");
        return th ? th.textContent.trim() : "";
      });

      this.datasets = headers.slice(1).map((seriesName, colIndex) => {
        return {
          label: seriesName,
          data: rows.map((row) => {
            const cells = row.querySelectorAll("td");
            const cell = cells[colIndex];
            return cell ? parseFloat(cell.textContent) : 0;
          }),
          backgroundColor: this.getColor(colIndex),
          stack: this.chartType === "stacked" ? "stack1" : undefined,
        };
      });
    } else if (["pie", "doughnut"].includes(this.chartType)) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      this.labels = rows.map((row) => {
        const th = row.querySelector("th");
        return th ? th.textContent.trim() : "";
      });
      this.data = rows.map((row) => {
        const td = row.querySelector("td");
        return td ? parseFloat(td.textContent.replace("%", "").trim()) : 0;
      });
    } else {
      // Basic bar or line chart with single dataset
      this.labels = headers;
      const firstRow = tbody.querySelector("tr");
      if (firstRow) {
        this.data = Array.from(firstRow.querySelectorAll("td")).map((td) => parseFloat(td.textContent));
      }
    }
  }

  makeTableAccessible() {
    this.table.setAttribute("aria-hidden", "false");
    this.table.setAttribute("role", "region");
    this.table.setAttribute("aria-label", "Chart data table " + this.tableId);
    // this.table.style.position = "absolute";
    // this.table.style.left = "-9999px";
    // this.table.style.top = "auto";
    // this.table.style.width = "1px";
    // this.table.style.height = "1px";
    this.table.style.overflow = "hidden";
    this.table.style.display = "none";
  }

  insertCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = this.chartId;
    this.table.insertAdjacentElement("afterend", canvas);
  }

  renderChart() {
    const ctx = document.getElementById(this.chartId).getContext("2d");

    let chartType = this.chartType;
    let data, options;

    if (["pie", "doughnut"].includes(chartType)) {
      data = {
        labels: this.labels,
        datasets: [
          {
            data: this.data,
            backgroundColor: this.labels.map((_, i) => this.getColor(i)),
          },
        ],
      };
    } else if (["stacked", "grouped"].includes(chartType)) {
      chartType = "bar";
      data = {
        labels: this.labels,
        datasets: this.datasets,
      };
    } else {
      data = {
        labels: this.labels,
        datasets: [
          {
            label: "Data",
            data: this.data,
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "#36a2eb",
            borderWidth: 1,
          },
        ],
      };
    }

    options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${this.chartType.charAt(0).toUpperCase() + this.chartType.slice(1)} Chart`,
        },
      },
      scales: ["stacked", "grouped"].includes(this.chartType)
        ? {
            x: { stacked: this.chartType === "stacked" },
            y: { stacked: this.chartType === "stacked", beginAtZero: true },
          }
        : {},
    };

    new Chart(ctx, {
      type: chartType,
      data,
      options,
    });
  }

  getColor(index) {
    const palette = ["#36a2eb", "#ff6384", "#ffcd56", "#4bc0c0", "#9966ff", "#c9cbcf"];
    return palette[index % palette.length];
  }
}

// Example usage
// new TableChart("endowment-value", "line").render();

// auto intitializer
document.addEventListener("DOMContentLoaded", function () {
  const tables = document.querySelectorAll("table[data-chart-type]");
  tables.forEach(function (table) {
    if (table.id) {
      new TableChart(table.id);
    } else {
      console.warn("Skipping table without ID:", table);
    }
  });
});
