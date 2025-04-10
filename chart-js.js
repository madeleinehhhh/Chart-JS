class TableChart {
  constructor(tableId, chartType = "line") {
    this.tableId = tableId;
    this.chartType = chartType;
    this.labels = [];
    this.data = [];
  }

  extractData() {
    const table = document.getElementById(this.tableId);
    if (!table) {
      console.warn(`Table with ID '${this.tableId}' not found.`);
      return;
    }

    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      const th = row.querySelector("th");
      const td = row.querySelector("td");
      const label = th?.textContent.trim();
      const value = td?.textContent.trim();
      if (label && value) {
        this.labels.push(label);
        this.data.push(Number(value));
      }
    });

    table.style.display = "none";
  }

  insertCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = `${this.tableId}-canvasjs`;
    const table = document.getElementById(this.tableId);
    table.parentNode.insertBefore(canvas, table.nextSibling);
    return canvas;
  }

  renderChart(canvas) {
    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: this.chartType,
      data: {
        labels: this.labels,
        datasets: [
          {
            label: `Data from #${this.tableId}`,
            data: this.data,
            fill: this.chartType === "line" || this.chartType === "radar",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Value" },
          },
          x: {
            title: { display: true, text: "Label" },
          },
        },
        plugins: {
          tooltip: {
            mode: "index",
            intersect: false,
          },
          legend: {
            display: true,
          },
        },
      },
    });
  }

  render() {
    this.extractData();
    const canvas = this.insertCanvas();
    this.renderChart(canvas);
  }
}

// Example usage
new TableChart("endowment-value", "line").render();
