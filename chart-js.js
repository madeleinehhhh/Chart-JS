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
          backgroundColor: this.getColor(colIndex),
          borderColor: this.getColor(colIndex),
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
        datasets: [
          {
            data: this.data,
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) {
                // Skip until chart is fully initialized
                return;
              }
    
              const gradients = [
                { from: "#006a52", to: "#154734" }, // dark green
                { from: "#f8ff94", to: "#ffb81c" }, // gold
                { from: "#98bc00", to: "#7a9a01" }, // light green
                { from: "#00933b", to: "#007a33" }, // green
              ];
              const i = context.dataIndex % gradients.length;
              const colorSet = gradients[i];
    
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
              gradient.addColorStop(0, colorSet.from);
              gradient.addColorStop(1, colorSet.to);
    
              return gradient;
            },
          },
        ],
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
      },
      scales: ["stacked", "grouped", "bar", "line"].includes(chartType)
        ? {
            x: { stacked: this.chartType === "stacked" },
            y: { stacked: this.chartType === "stacked", beginAtZero: true },
          }
        : {},
    };

    if (this.chartType === "line" && this.table.dataset.fill === "true") {
      const canvas = document.getElementById(this.chartId);
      const ctx = canvas.getContext("2d");
    
      // Define the gradient to start 10% down the canvas and go to 90% of the height
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.9); // Start at 10% height
    
      // Gradient colors: Top (#ffb81c) → Bottom (#f8ff94)
      gradient.addColorStop(0, "#ffb81c");
      gradient.addColorStop(1, "#f8ff94");
    
      // Apply the gradient to each dataset's background color
      this.datasets.forEach(dataset => {
        dataset.backgroundColor = gradient; // Set the gradient for the fill
        dataset.borderColor = "transparent"; // No border for area chart
        dataset.fill = true; // Ensure the chart is filled with the gradient
      });
    }
            
    new Chart(ctx, {
      type: chartType,
      data,
      options,
    });
  }

  getColor(index) {
    const palette = [
      "#154734", // dark green
      "#ffb81c", // gold
      "#7a9a01", // light green
      "#007a33", // green
    ];
    return palette[index % palette.length];
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
