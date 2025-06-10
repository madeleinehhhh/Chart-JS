class TableChart {
  constructor(tableId) {
    this.tableId = tableId;
    this.table = document.getElementById(tableId);
    this.chartId = `${tableId}-canvasjs`;
    this.labels = [];
    this.datasets = [];

    if (!this.table)
      return console.error(`Table with ID "${tableId}" not found.`);

    this.chartType = this.table.dataset.chartType;
    if (!this.chartType)
      return console.error(
        `No data-chart-type attribute found on table with ID "${tableId}".`
      );

    this.tooltipFormat = this.table.dataset.tooltipFormat || null;

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

    if (["line", "bar", "stacked", "grouped"].includes(this.chartType)) {
      this.labels = rows.map(
        (row) => row.querySelector("th")?.textContent.trim() || ""
      );

      this.datasets = headerCells.slice(1).map((seriesName, colIndex) => ({
        label: seriesName,
        data: rows.map((row) => {
          const cell = row.querySelectorAll("td")[colIndex];
          return cell ? parseFloat(cell.textContent) : 0;
        }),
        backgroundColor: this.getColor(colIndex),
        borderColor: this.getColor(colIndex),
        fill:
          this.chartType === "line" ? this.table.dataset.fill === "true" : true,
        tension: this.chartType === "line" ? 0.3 : 0,
        stack: this.chartType === "stacked" ? "stack1" : undefined,
      }));
    } else if (["pie", "doughnut"].includes(this.chartType)) {
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
    if (!canvas)
      return console.error(`Canvas with ID ${this.chartId} not found.`);

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

  renderChart() {
    const canvas = document.getElementById(this.chartId);
    const ctx = canvas.getContext("2d");

    canvas.removeAttribute("width");
    canvas.removeAttribute("height");

    let chartType = this.chartType;
    if (["stacked", "grouped"].includes(chartType)) chartType = "bar";

    let data = {};
    if (["pie", "doughnut"].includes(chartType)) {
      data = {
        labels: this.labels,
        datasets: [
          {
            data: this.data,
            backgroundColor: (context) =>
              this.createRadialGradient(context, [
                { from: "#006a52", to: "#154734" },
                { from: "#f8ff94", to: "#ffb81c" },
                { from: "#98bc00", to: "#7a9a01" },
                { from: "#00933b", to: "#007a33" },
              ]),
            radius: "80%",
          },
        ],
      };
    } else {
      data = { labels: this.labels, datasets: this.datasets };

      if (this.chartType === "line" && this.table.dataset.fill === "true") {
        this.datasets.forEach((dataset) => {
          dataset.backgroundColor = (context) =>
            this.createVerticalGradient(context, "#ffb81c", "#f8ff94");
          dataset.borderColor = "transparent";
          dataset.fill = true;
        });
      }

      if (["bar", "stacked", "grouped"].includes(this.chartType)) {
        this.datasets.forEach((dataset, index) => {
          const colors = [
            { from: "#006a52", to: "#154734" },
            { from: "#00933b", to: "#007a33" },
            { from: "#98bc00", to: "#7a9a01" },
            { from: "#f8ff94", to: "#ffb81c" },
          ];
          const { from, to } = colors[index % colors.length];
          dataset.backgroundColor = (ctx) =>
            this.createVerticalGradient(ctx, from, to);
          dataset.borderColor = "transparent";
        });
      }
    }

    const options = {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1500, easing: "easeInQuart" },
      plugins: {
        title: { display: false },
        legend: {
          display: ["pie", "doughnut"].includes(chartType),
          position: "bottom",
          align: "start",
        },
        tooltip: {
          callbacks: {
            label: (context) => this.getTooltipLabelCallback()(context),
          },
        },
      },
      scales: ["line", "bar", "stacked", "grouped"].includes(this.chartType)
        ? {
            x: {
              stacked: this.chartType === "stacked",
              ticks: {
                callback(value) {
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
          }
        : {},
    };

    this.observeResize(canvas);
  }

  createRadialGradient(context, gradientSets) {
    const { chart, dataIndex } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { from, to } = gradientSets[dataIndex % gradientSets.length];
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

  createVerticalGradient(context, from, to) {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
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

  getTooltipLabelCallback() {
    switch (this.tooltipFormat) {
      case "dollars-millions":
        return (context) => `$${(context.raw * 1_000_000).toLocaleString()}`;
      case "percentages":
        return (context) => `${context.raw}%`;
      default:
        return (context) => context.raw;
    }
  }

  getColor(index) {
    const palette = ["#154734", "#ffb81c", "#7a9a01", "#007a33"];
    return palette[index % palette.length];
  }

  observeResize(canvas) {
    let lastWidth = canvas.offsetWidth;
    let lastHeight = canvas.offsetHeight;
    let resizeScheduled = false;

    const resizeObserver = new ResizeObserver(() => {
      const currentWidth = canvas.offsetWidth;
      const currentHeight = canvas.offsetHeight;

      if (currentWidth !== lastWidth || currentHeight !== lastHeight) {
        lastWidth = currentWidth;
        lastHeight = currentHeight;

        if (!resizeScheduled) {
          resizeScheduled = true;
          requestAnimationFrame(() => {
            if (this.chart) {
              this.chart.destroy();
            }
            this.renderChart();
            resizeScheduled = false;
          });
        }
      }
    });

    resizeObserver.observe(canvas.parentElement || canvas);
  }
}

// Auto-init
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("table[data-chart-type]").forEach((table) => {
    if (table.id) new TableChart(table.id);
    else console.warn("Skipping table without ID:", table);
  });
});
