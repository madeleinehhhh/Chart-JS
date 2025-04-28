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

  getColor(index, ctx, chartType) {
    const gradients = {
      gold: ['#f8ff94', '#ffb81c'],
      darkGreen: ['#006a52', '#154734'],
      green: ['#00933b', '#007a33'],
      lightGreen: ['#98bc00', '#7a9a01']
    };
  
    if (["pie", "doughnut"].includes(chartType)) {
      const colors = Object.values(gradients)[index % Object.values(gradients).length];
      const centerX = ctx.canvas.width / 2;
      const centerY = ctx.canvas.height / 2;
      const radius = Math.min(centerX, centerY);
  
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      return gradient;
    }
  
    if (chartType === "line" && this.table.dataset.fill === "true") {
      const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
      gradient.addColorStop(0, gradients.gold[1]);
      gradient.addColorStop(1, gradients.gold[0]);
      return gradient;
    }
  
    if (chartType === "bar" || chartType === "stacked" || chartType === "grouped") {
      const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
      gradient.addColorStop(0, gradients.darkGreen[1]);
      gradient.addColorStop(1, gradients.darkGreen[0]);
      return gradient;
    }
  
    // fallback solid colors
    const palette = ["#36a2eb", "#ff6384", "#ffcd56", "#4bc0c0", "#9966ff", "#c9cbcf"];
    return palette[index % palette.length];
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
            backgroundColor: this.labels.map((_, i) => this.getColor(i, ctx, chartType)),
          },
        ],
      };
    } else {
      if (["stacked", "grouped"].includes(chartType)) {
        chartType = "bar";
      }
      data = {
        labels: this.labels,
        datasets: this.datasets.map((dataset, i) => ({
          ...dataset,
          backgroundColor: this.getColor(i, ctx, this.chartType),
          borderColor: this.getColor(i, ctx, this.chartType),
          fill: this.chartType === "line" && this.table.dataset.fill === "true",
          tension: this.chartType === "line" ? 0.3 : 0,
        })),
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
