/**
 * Chart Utilities - Common chart configurations and helpers
 */
class ChartUtils {
    static getDefaultColors() {
        return {
            success: 'rgba(75, 192, 192, 0.8)',
            successBorder: 'rgba(75, 192, 192, 1)',
            danger: 'rgba(255, 99, 132, 0.8)',
            dangerBorder: 'rgba(255, 99, 132, 1)',
            warning: 'rgba(255, 206, 86, 0.8)',
            warningBorder: 'rgba(255, 206, 86, 1)',
            info: 'rgba(54, 162, 235, 0.8)',
            infoBorder: 'rgba(54, 162, 235, 1)',
            secondary: 'rgba(153, 102, 255, 0.8)',
            secondaryBorder: 'rgba(153, 102, 255, 1)'
        };
    }

    static getDefaultTooltipStyle() {
        return {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#e2e8f0',
            borderWidth: 1
        };
    }

    static getDefaultScaleStyle() {
        return {
            grid: {
                color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
                color: '#6b7280',
                font: {
                    size: 11,
                    weight: '500'
                }
            }
        };
    }

    static createWinLossChart(ctx, chartData, chartLabels) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Win/Loss Trend',
                    data: chartData,
                    backgroundColor: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value === 1 ? 'rgba(75, 192, 192, 0.3)' : 'rgba(255, 99, 132, 0.3)';
                    },
                    borderColor: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value === 1 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                    },
                    pointBackgroundColor: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value === 1 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                    },
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        ...ChartUtils.getDefaultTooltipStyle(),
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return context.parsed.y === 1 ? '🟢 Victory' : '🔴 Defeat';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ...ChartUtils.getDefaultScaleStyle(),
                        ticks: {
                            ...ChartUtils.getDefaultScaleStyle().ticks,
                            stepSize: 1,
                            callback: function(value) {
                                return value === 1 ? 'Win' : 'Loss';
                            }
                        }
                    },
                    x: {
                        ...ChartUtils.getDefaultScaleStyle(),
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            ...ChartUtils.getDefaultScaleStyle().ticks,
                            font: {
                                size: 10,
                                weight: '500'
                            }
                        }
                    }
                }
            }
        });
    }

    static createPieChart(ctx, labels, data, title) {
        const colors = ChartUtils.getDefaultColors();
        const backgroundColors = [
            colors.danger, colors.info, colors.warning, 
            colors.success, colors.secondary, 'rgba(255, 159, 64, 0.8)'
        ];
        const borderColors = [
            colors.dangerBorder, colors.infoBorder, colors.warningBorder,
            colors.successBorder, colors.secondaryBorder, 'rgba(255, 159, 64, 1)'
        ];

        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: title || 'Data',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: ChartUtils.getDefaultTooltipStyle()
                }
            }
        });
    }

    static createBarChart(ctx, labels, data, label, color, isHorizontal = false) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: color || ChartUtils.getDefaultColors().info,
                    borderColor: color?.replace('0.8', '1') || ChartUtils.getDefaultColors().infoBorder,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                indexAxis: isHorizontal ? 'y' : 'x',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: ChartUtils.getDefaultTooltipStyle()
                },
                scales: {
                    [isHorizontal ? 'x' : 'y']: {
                        beginAtZero: true,
                        ...ChartUtils.getDefaultScaleStyle()
                    },
                    [isHorizontal ? 'y' : 'x']: {
                        ...ChartUtils.getDefaultScaleStyle(),
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Export for module use
window.ChartUtils = ChartUtils;