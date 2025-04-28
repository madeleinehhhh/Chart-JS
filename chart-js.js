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

    const headerCells = Array.from(thead.querySelectorAll("th")).map((th) => th.textContent.trim());

    if (["line", "bar", "stacked", "grouped", "area"].includes(this.chartType)) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      this.labels = rows.map((row) => {
        const th = row.querySelector("th");
        return th ? th.textContent.trim() : "";
      });

      this.datasets = headerCells.slice(1).map((seriesName, colIndex) => {
        return {
          label: seriesName,
          data: rows.map((row) => {
            const cells = row.querySelectorAll("td");
            const cell = cells[colIndex];
            return cell ? parseFloat(cell.textContent) : 0;
          }),
          backgroundColor: null, // We'll apply gradient in renderChart
          borderColor: null,
          fill: this.chartType === "area" ? true : false,
          tension: this.chartType === "line" || this.chartType === "area" ? 0.3 : 0,
          stack: this.chartType === "stacked" ? "stack1" : undefined,
        };
      });
    } else if (["pie", "doughnut"].includes(this.chartType)) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      this.labels = [];
      this.data = [];

      rows.forEach((row) => {
        const th = row.querySelector("th");
        const td = row.querySelector("td");
        if (th && td) {
          this.labels.push(th.textContent.trim());
          this.data.push(parseFloat(td.textContent));
        }
      });
    }
  }

  makeTableAccessible() {
    this.table.setAttribute("aria-hidden", "false");
    this.table.setAttribute("role", "region");
    this.table.setAttribute("aria-label", "Chart data table");
    this.table.style.overflow = "hidden";
    this.table.style.display = "none";
  }

  insertCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = this.chartId;
    this.table.insertAdjacentElement("afterend", canvas);
  }

  createGradient(ctx, type, colors) {
    let gradient;
    if (type === "radial") {
      gradient = ctx.createRadialGradient(
        ctx.canvas.width / 2,
        ctx.canvas.height / 2,
        0,
        ctx.canvas.width / 2,
        ctx.canvas.height / 2,
        ctx.canvas.width / 2
      );
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    }
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    return gradient;
  }

  getColor(ctx, chartType, index = 0) {
    const gradients = [
      ["#f8ff94", "#ffb81c"], // gold
      ["#006a52", "#154734"], // dark green
      ["#00933b", "#007a33"], // green
      ["#98bc00", "#7a9a01"], // light green
    ];

    if (["pie", "doughnut"].includes(chartType)) {
      const colorSet = gradients[index % gradients.length];
      return this.createGradient(ctx, "radial", colorSet);
    } else if (chartType === "bar" || chartType === "stacked" || chartType === "grouped") {
      return this.createGradient(ctx, "linear", ["#006a52", "#154734"]); // dark green
    } else if (chartType === "area") {
      return this.createGradient(ctx, "linear", ["#f8ff94", "#ffb81c"]); // gold
    } else {
      return "#36a2eb"; // fallback solid color
    }
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
            backgroundColor: this.labels.map((_, i) => this.getColor(ctx, chartType, i)),
          },
        ],
      };
    } else {
      if (["stacked", "grouped"].includes(chartType)) {
        chartType = "bar";
      }

      // Apply colors to datasets
      this.datasets = this.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: this.getColor(ctx, this.chartType, index),
        borderColor: (this.chartType === "line" || this.chartType === "area") ? "#ffb81c" : undefined,
      }));

      data = {
        labels: this.labels,
        datasets: this.datasets,
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
      scales: ["stacked", "grouped", "bar", "line", "area"].includes(chartType)
        ? {
            x: { stacked: this.chartType === "stacked" },
            y: { stacked: this.chartType === "stacked", beginAtZero: true },
          }
        : {},
    };

    new Chart(ctx, {
      type: chartType === "area" ? "line" : chartType,
      data,
      options,
    });
  }
}

// Auto-init all tables with data-chart-type
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
