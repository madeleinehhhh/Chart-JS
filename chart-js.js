class TableChart {
  constructor(tableId) {
    this.tableId = tableId;
    this.table = document.getElementById(tableId);
    this.chartId = `${tableId}-canvasjs`;
    this.labels = [];
    this.datasets = [];
    this.data = []; // For pie/doughnut charts

    if (!this.table) {
      console.error(`Table with ID "${tableId}" not found.`);
      return;
    }

    this.chartType = this.table.dataset.chartType;
    if (!this.chartType) {
      console.error(
        `No data-chart-type attribute found on table with ID "${tableId}".`
      );
      return;
    }

    this.tooltipFormat = this.table.dataset.tooltipFormat || null;
    this.gradientColors = [
      { from: "#006a52", to: "#154734" }, // dark green
      { from: "#f8ff94", to: "#ffb81c" }, // gold
      { from: "#98bc00", to: "#7a9a01" }, // light green
      { from: "#00933b", to: "#007a33" }, // green
    ];

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

    if (this.isMultiSeriesChart()) {
      this.parseMultiSeriesData(headerCells, tbody);
    } else if (this.isPieChart()) {
      this.parsePieData(tbody);
    }
  }

  isMultiSeriesChart() {
    return ["line", "bar", "stacked", "grouped"].includes(this.chartType);
  }

  isPieChart() {
    return ["pie", "doughnut"].includes(this.chartType);
  }

  parseMultiSeriesData(headerCells, tbody) {
    const rows = Array.from(tbody.querySelectorAll("tr"));

    this.labels = rows.map((row) => {
      const th = row.querySelector("th");
      return th ? th.textContent.trim() : "";
    });

    this.datasets = headerCells.slice(1).map((seriesName, colIndex) => ({
      label: seriesName,
      data: rows.map((row) => {
        const cells = row.querySelectorAll("td");
        const cell = cells[colIndex];
        return cell ? parseFloat(cell.textContent) : 0;
      }),
      backgroundColor: this.getBackgroundColor(colIndex),
      borderColor: this.getBorderColor(colIndex),
      fill:
        this.chartType === "line" ? this.table.dataset.fill === "true" : true,
      tension: this.chartType === "line" ? 0.3 : 0,
      stack: this.chartType === "stacked" ? "stack1" : undefined,
    }));
  }

  parsePieData(tbody) {
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

  makeTableAccessible() {
    this.table.setAttribute("aria-hidden", "false");
    this.table.setAttribute("role", "region");
    this.table.setAttribute("aria-label", "Chart data table");
    this.table.style.overflow = "hidden";
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

  renderChart() {
    const canvas = document.getElementById(this.chartId);
    if (!canvas) {
      console.error(`Canvas with ID ${this.chartId} not found.`);
      return;
    }

    const ctx = canvas.getContext("2d");

    // Clear fixed dimensions to let CSS control sizing
    canvas.removeAttribute("width");
    canvas.removeAttribute("height");

    const chartConfig = this.getChartConfig();

    // Clean up existing chart and observer
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.chart = new Chart(ctx, chartConfig);
    this.observeResize(canvas);
  }

  getChartConfig() {
    const data = this.getChartData();
    const options = this.getChartOptions();
    let chartType = this.getChartJSType();

    return { type: chartType, data, options };
  }

  getChartJSType() {
    const typeMap = {
      stacked: "bar",
      grouped: "bar",
    };
    return typeMap[this.chartType] || this.chartType;
  }

  getChartData() {
    if (this.isPieChart()) {
      return {
        labels: this.labels,
        datasets: [
          {
            data: this.data,
            backgroundColor: this.createPieGradients.bind(this),
            radius: "80%",
          },
        ],
      };
    }

    return {
      labels: this.labels,
      datasets: this.datasets,
    };
  }

  getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1500,
        easing: "easeInQuart",
      },
      plugins: {
        title: { display: false },
        legend: {
          display: this.isPieChart(),
          position: "bottom",
          align: "start",
        },
        tooltip: {
          callbacks: {
            label: this.getTooltipLabelCallback(),
          },
          padding: 10,
          boxPadding: 6,
          titleMarginBottom: 4,
        },
      },
      scales: this.getScalesConfig(),
    };
  }

  getScalesConfig() {
    if (this.isPieChart()) return {};

    return {
      x: {
        stacked: this.chartType === "stacked",
        ticks: {
          callback: function (value) {
            const label = this.getLabelForValue(value);
            const maxWidth = 10;
            return label.length > maxWidth
              ? label.split(" ").reduce((acc, word) => {
                  const last = acc[acc.length - 1];
                  if (last && (last + " " + word).length <= maxWidth) {
                    acc[acc.length - 1] = last + " " + word;
                  } else {
                    acc.push(word);
                  }
                  return acc;
                }, [])
              : label;
          },
          maxRotation: 0,
          minRotation: 0,
        },
      },
      y: {
        stacked: this.chartType === "stacked",
        beginAtZero: true,
      },
    };
  }

  getBackgroundColor(index) {
    if (this.chartType === "line" && this.table.dataset.fill === "true") {
      return this.createLineGradient.bind(this);
    }

    if (["bar", "stacked", "grouped"].includes(this.chartType)) {
      return this.createBarGradient.bind(this, index);
    }

    return this.getStaticColor(index);
  }

  getBorderColor(index) {
    if (this.chartType === "line" && this.table.dataset.fill === "true") {
      return "transparent";
    }

    if (["bar", "stacked", "grouped"].includes(this.chartType)) {
      return "transparent";
    }

    return this.getStaticColor(index);
  }

  createLineGradient(context) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const gradient = ctx.createLinearGradient(
      0,
      chartArea.top,
      0,
      chartArea.bottom
    );
    gradient.addColorStop(0, "#ffb81c");
    gradient.addColorStop(1, "#f8ff94");
    return gradient;
  }

  createBarGradient(datasetIndex, context) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const { from, to } =
      this.gradientColors[datasetIndex % this.gradientColors.length];
    const gradient = ctx.createLinearGradient(
      0,
      chartArea.top,
      0,
      chartArea.bottom
    );
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    return gradient;
  }

  createPieGradients(context) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const i = context.dataIndex % this.gradientColors.length;
    const { from, to } = this.gradientColors[i];

    const width = chartArea.right - chartArea.left;
    const height = chartArea.bottom - chartArea.top;
    const radius = Math.min(width, height) / 2;

    const gradient = ctx.createRadialGradient(
      chartArea.left + width / 2,
      chartArea.top + height / 2,
      0,
      chartArea.left + width / 2,
      chartArea.top + height / 2,
      radius
    );
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    return gradient;
  }

  setupIntersectionObserver() {
    const canvas = document.getElementById(this.chartId);

    if (!canvas) {
      console.error(`Canvas with ID ${this.chartId} not found.`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.renderChart();
            observerInstance.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.9 }
    );

    observer.observe(canvas);
  }

  getTooltipLabelCallback() {
    const format = this.tooltipFormat;

    const formatters = {
      "dollars-millions": (context) => {
        const value = context.raw * 1_000_000;
        return `$${value.toLocaleString()}`;
      },
      percentages: (context) => `${context.raw}%`,
      default: (context) => context.raw,
    };

    return formatters[format] || formatters.default;
  }

  getStaticColor(index) {
    const palette = [
      "#154734", // dark green
      "#ffb81c", // gold
      "#7a9a01", // light green
      "#007a33", // green
    ];
    return palette[index % palette.length];
  }

  observeResize(canvas) {
    // Debounce resize events to prevent infinite loops
    let resizeTimeout;

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 100);
    });

    resizeObserver.observe(canvas.parentElement || canvas);
    this.resizeObserver = resizeObserver; // Store for cleanup
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
