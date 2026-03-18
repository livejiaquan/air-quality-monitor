let chartInstance = null;
let historyChartInstance = null;

/**
 * Renders or updates the pollutant chart in the details panel.
 * @param {object} station - The station data.
 */
export function renderPollutantChart(station) {
    const ctx = document.getElementById('pollutantChart').getContext('2d');

    // Prepare data
    // Some values might be string "ND" or empty, parse safely
    const parseVal = (val) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const data = {
        labels: ['PM2.5', 'PM10', 'O3', 'CO', 'SO2', 'NO2'],
        datasets: [{
            label: '污染物濃度',
            data: [
                parseVal(station['pm2.5']),
                parseVal(station['pm10']),
                parseVal(station['o3']),
                parseVal(station['co']) * 10, // Scale CO (usually small) for visibility
                parseVal(station['so2']),
                parseVal(station['no2'])
            ],
            backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue-500 with opacity
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        }]
    };

    const config = {
        type: 'radar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    pointLabels: {
                        font: {
                            size: 10
                        }
                    },
                    ticks: {
                        display: false // Hide numbers on axis to keep it clean
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            let val = context.raw;
                            // Unscale CO for tooltip
                            if (context.label === 'CO') {
                                val = val / 10;
                            }
                            return label + val;
                        }
                    }
                }
            }
        }
    };

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, config);
}

/**
 * Renders a 24-hour PM2.5 trend line chart.
 * @param {Array} records - Sorted array of hourly historical records.
 */
export function renderHistoryChart(records) {
    const canvas = document.getElementById('historyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? '#9ca3af' : '#6b7280';

    const labels = records.map(d => d.datacreationdate.slice(11, 16));
    const values = records.map(d => parseFloat(d.pm25) || 0);

    // Color points by PM2.5 level
    const pointColors = values.map(v => {
        if (v <= 15) return '#009866';
        if (v <= 35) return '#FFDE33';
        if (v <= 54) return '#FF9933';
        if (v <= 150) return '#CC0033';
        return '#660099';
    });

    if (historyChartInstance) historyChartInstance.destroy();

    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'PM2.5',
                data: values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: pointColors,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `PM2.5: ${ctx.raw} μg/m³`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: tickColor, font: { size: 9 }, maxRotation: 0, maxTicksLimit: 8 },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: tickColor, font: { size: 9 } },
                    grid: { color: gridColor }
                }
            }
        }
    });
}
