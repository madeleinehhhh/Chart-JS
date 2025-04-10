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
    const rows = Array.from(this.table.querySelectorAll("tr"));
    const headers = Array.from(rows[0].querySelectorAll("th")).map((th) => th.textContent.trim());

    if (["stacked", "grouped"].includes(this.chartType)) {
      this.labels = rows.slice(1).map((row) => row.querySelector("th").textContent.trim());

      this.datasets = headers.slice(1).map((seriesName, colIndex) => {
        return {
          label: seriesName,
          data: rows.slice(1).map((row) => {
            const cell = row.querySelectorAll("td")[colIndex];
            return cell ? parseFloat(cell.textContent) : 0;
          }),
          backgroundColor: this.getColor(colIndex),
          stack: this.chartType === "stacked" ? "stack1" : undefined,
        };
      });
    } else {
      this.labels = headers;
      const dataRow = rows[1];
      this.data = Array.from(dataRow.querySelectorAll("td")).map((td) => parseFloat(td.textContent));
    }
  }

  makeTableAccessible() {
    this.table.setAttribute("aria-hidden", "false");
    this.table.setAttribute("role", "region");
    this.table.setAttribute("aria-label", "Chart data table");
    this.table.style.position = "absolute";
    this.table.style.left = "-9999px";
    this.table.style.top = "auto";
    this.table.style.width = "1px";
    this.table.style.height = "1px";
    this.table.style.overflow = "hidden";
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
document.addEventListener("DOMContentLoaded", () => {
  const tables = document.querySelectorAll("table[data-chart-type]");
  tables.forEach((table) => {
    if (table.id) {
      new TableChart(table.id);
    } else {
      console.warn("Skipping table without ID:", table);
    }
  });
});
