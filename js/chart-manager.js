class ChartManager {
    constructor() {
        this.charts = new Map();
        this.canvasIds = ['recrutementChart', 'departChart'];
    }

    destroyAllCharts() {
        this.charts.forEach((chart, id) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    destroyChart(canvasId) {
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
            this.charts.delete(canvasId);
        }
    }

    createRecrutementChart(data) {
        this.destroyChart('recrutementChart');
        const ctx = document.getElementById('recrutementChart')?.getContext('2d');
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Nombre de recrutements',
                    data: Object.values(data),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true } },
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                }
            }
        });

        this.charts.set('recrutementChart', chart);
        return chart;
    }

    createDepartChart(data) {
        this.destroyChart('departChart');
        const ctx = document.getElementById('departChart')?.getContext('2d');
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Nature de depart',
                    data: Object.values(data),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                }
            }
        });

        this.charts.set('departChart', chart);
        return chart;
    }
}
