let chartInstance = null;

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
