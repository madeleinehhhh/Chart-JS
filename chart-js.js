class TableChart {
  constructor(tableId) {
    this.tableId = tableId;
    this.table = document.getElementById(tableId);
    if (!this.table)
      return console.error(`Table with ID "${tableId}" not found.`);

    this.chartId = `${tableId}-canvasjs`;
    this.chartType = this.table.dataset.chartType;
    this.tooltipFormat = this.table.dataset.tooltipFormat || null;
    this.chart = null;
    this.hasObservedResize = false;

    if (!this.chartType) {
      return console.error(
        `No data-chart-type attribute found on table with ID "${tableId}".`
      );
    }

    this.prepareChart();
  }

  prepareChart() {
    this.parseTable();
    this.makeTableAccessible();
    this.insertCanvas();
    this.setupIntersectionObserver();
  }

  parseTable() {
    const thead = this.table.querySelector("thead");
    const tbody = this.table.querySelector("tbody");

    if (!thead || !tbody) {
      console.error(
        `Table with ID "${this.tableId}" must have both <thead> and <tbody>.`
      );
      return;
    }

    const headerCells = Array.from(thead.querySelectorAll("th")).map((th) =>
      th.textContent.trim()
    );
    const rows = Array.from(tbody.querySelectorAll("tr"));

    this.labels = [];
    this.datasets = [];
    this.data = [];

    if (["line", "bar", "stacked", "grouped"].includes(this.chartType)) {
      this.labels = rows.map(
        (row) => row.querySelector("th")?.textContent.trim() || ""
      );
      this.datasets = headerCells.slice(1).map((label, colIndex) => {
        const data = rows.map((row) => {
          const cell = row.querySelectorAll("td")[colIndex];
          return cell ? parseFloat(cell.textContent) : 0;
        });
        return {
          label,
          data,
          backgroundColor: this.getColor(colIndex),
          borderColor: this.getColor(colIndex),
          fill:
            this.chartType === "line"
              ? this.table.dataset.fill === "true"
              : true,
          tension: this.chartType === "line" ? 0.3 : 0,
          stack: this.chartType === "stacked" ? "stack1" : undefined,
        };
      });
    } else if (["pie", "doughnut"].includes(this.chartType)) {
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
    this.table.setAttribute("aria-hidden", "true");
    this.table.style.display = "none";
  }

  insertCanvas() {
    const container = document.createElement("div");
    container.className = "chart-container";

    const canvas = document.createElement("canvas");
    canvas.id = this.chartId;
    canvas.style.display = "block";
    canvas.style.width = "100%";

    container.appendChild(canvas);
    this.table.insertAdjacentElement("afterend", container);
  }

  setupIntersectionObserver() {
    const canvas = document.getElementById(this.chartId);
    if (!canvas) return;

    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.renderChart();
            observerInstance.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(canvas);
  }

  renderChart() {
    const canvas = document.getElementById(this.chartId);
    const ctx = canvas.getContext("2d");
    canvas.removeAttribute("width");
    canvas.removeAttribute("height");

    let chartType = this.chartType;
    if (["stacked", "grouped"].includes(chartType)) chartType = "bar";

    const config = {
      type: chartType,
      data: this.getChartData(chartType),
      options: this.getChartOptions(chartType),
    };

    this.chart = new Chart(ctx, config);

    if (!this.hasObservedResize) {
      this.observeResize(canvas);
      this.hasObservedResize = true;
    }
  }

  getChartData(chartType) {
    if (["pie", "doughnut"].includes(chartType)) {
      return {
        labels: this.labels,
        datasets: [
          {
            data: this.data,
            backgroundColor: this.labels.map((_, i) => this.getColor(i)),
          },
        ],
      };
    }
    return {
      labels: this.labels,
      datasets: this.datasets,
    };
  }

  getChartOptions(chartType) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1000 },
      plugins: {
        legend: {
          display: ["pie", "doughnut"].includes(chartType),
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => this.formatTooltip(context),
          },
        },
      },
      scales: ["line", "bar"].includes(chartType)
        ? {
            x: { stacked: this.chartType === "stacked" },
            y: { beginAtZero: true, stacked: this.chartType === "stacked" },
          }
        : {},
    };
  }

  observeResize(canvas) {
    const resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });
    resizeObserver.observe(canvas);
  }

  formatTooltip(context) {
    switch (this.tooltipFormat) {
      case "dollars-millions":
        return `$${(context.raw * 1_000_000).toLocaleString()}`;
      case "percentages":
        return `${context.raw}%`;
      default:
        return context.raw;
    }
  }

  getColor(index) {
    const palette = ["#154734", "#ffb81c", "#7a9a01", "#007a33"];
    return palette[index % palette.length];
  }
}

// Auto-init
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("table[data-chart-type]").forEach((table) => {
    if (table.id) new TableChart(table.id);
  });
});
