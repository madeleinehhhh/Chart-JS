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

    if (["line", "bar", "stacked", "grouped"].includes(this.chartType)) {
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
          backgroundColor: (ctx) => this.getGradientColor(colIndex, ctx.chart.ctx, this.chartType),
          borderColor: (ctx) => this.getGradientColor(colIndex, ctx.chart.ctx, this.chartType),
          fill: this.chartType === "line" ? (this.table.dataset.fill === "true") : true,
          tension: this.chartType === "line" ? 0.3 : 0,
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

  renderChart() {
    const ctx = document.getElementById(this.chartId).getContext("2d");

    let chartType = this.chartType;
    let data, options;

    if (["pie", "doughnut"].includes(chartType)) {
      data = {
        labels: this.labels,
        datasets: [{
          data: this.data,
          backgroundColor: this.labels.map((_, i) => this.getGradientColor(i, ctx, this.chartType)),
        }],
      };
    } else {
      if (["stacked", "grouped"].includes(chartType)) {
        chartType = "bar";
      }
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
        legend: {
          labels: {
            color: '#333',
          },
        },
      },
      scales: ["stacked", "grouped", "bar", "line"].includes(chartType)
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

  getGradientColor(index, ctx, type) {
    const schemes = {
      gold: ['#f8ff94', '#ffb81c'],
      darkGreen: ['#006a52', '#154734'],
      green: ['#00933b', '#007a33'],
      lightGreen: ['#98bc00', '#7a9a01'],
    };

    const gradients = Object.values(schemes);
    const [start, end] = gradients[index % gradients.length];

    if (type === "pie" || type === "doughnut") {
      const radial = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
      radial.addColorStop(0, start);
      radial.addColorStop(1, end);
      return radial;
    } else if (type === "line") {
      const linear = ctx.createLinearGradient(0, 400, 0, 0);
      linear.addColorStop(0, start);
      linear.addColorStop(1, "rgba(255,184,28,0)"); // transparent top
      return linear;
    } else {
      const linear = ctx.createLinearGradient(0, 400, 0, 0);
      linear.addColorStop(0, start);
      linear.addColorStop(1, end);
      return linear;
    }
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
