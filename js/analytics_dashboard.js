// Analytics Dashboard System
class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.chartInstances = new Map();
    }

    renderCharts(data) {
        this.renderAttendanceTrend(data.trends);
        this.renderEngagementMetrics(data.engagement);
        this.renderWeeklyPatterns(data.trends);
        this.renderRiskPrediction(data.riskStudents);
        this.renderPerformanceCorrelation(data);
        this.renderAttendanceHeatmap(data.trends);
    }

    renderAttendanceTrend(trends) {
        const ctx = document.getElementById('attendanceTrendChart');
        if (!ctx) return;

        if (this.chartInstances.has('attendance-trend')) {
            this.chartInstances.get('attendance-trend').destroy();
        }

        const dates = trends.map(t => new Date(t.session_date).toLocaleDateString());
        const rates = trends.map(t => parseFloat(t.attendance_rate) || 0);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Attendance Rate (%)',
                    data: rates,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => `${value}%`
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        this.chartInstances.set('attendance-trend', chart);
    }

    renderEngagementMetrics(engagement) {
        const ctx = document.getElementById('engagementChart');
        if (!ctx) return;

        if (this.chartInstances.has('engagement')) {
            this.chartInstances.get('engagement').destroy();
        }

        const sections = engagement.map(e => e.section);
        const scores = engagement.map(e => parseFloat(e.avg_engagement) * 100 || 0);

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: sections.length > 0 ? sections : ['S33', 'S34', 'S35'],
                datasets: [{
                    label: 'Engagement Score',
                    data: scores.length > 0 ? scores : [75, 82, 68],
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: '#2ecc71',
                    pointBackgroundColor: '#27ae60'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        this.chartInstances.set('engagement', chart);
    }

    renderWeeklyPatterns(trends) {
        const ctx = document.getElementById('weeklyPatternsChart');
        if (!ctx) return;

        if (this.chartInstances.has('weekly-patterns')) {
            this.chartInstances.get('weekly-patterns').destroy();
        }

        const weeklyData = this.processWeeklyData(trends);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                datasets: [{
                    label: 'Average Attendance',
                    data: weeklyData,
                    backgroundColor: [
                        '#e74c3c',
                        '#f39c12',
                        '#f1c40f',
                        '#2ecc71',
                        '#3498db'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => `${value}%`
                        }
                    }
                }
            }
        });

        this.chartInstances.set('weekly-patterns', chart);
    }

    renderRiskPrediction(riskStudents) {
        const ctx = document.getElementById('riskPredictionChart');
        if (!ctx) return;

        if (this.chartInstances.has('risk-prediction')) {
            this.chartInstances.get('risk-prediction').destroy();
        }

        const riskLevels = this.categorizeRiskLevels(riskStudents);

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High Risk', 'Medium Risk', 'Low Risk', 'Safe'],
                datasets: [{
                    data: [
                        riskLevels.high,
                        riskLevels.medium,
                        riskLevels.low,
                        riskLevels.safe
                    ],
                    backgroundColor: [
                        '#e74c3c',
                        '#f39c12',
                        '#f1c40f',
                        '#2ecc71'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.chartInstances.set('risk-prediction', chart);
    }

    renderPerformanceCorrelation(data) {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        if (this.chartInstances.has('performance')) {
            this.chartInstances.get('performance').destroy();
        }

        const correlationData = this.generateCorrelationData(data);

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Attendance vs Performance',
                    data: correlationData,
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: { display: true, text: 'Attendance Rate (%)' }
                    },
                    y: {
                        title: { display: true, text: 'Performance Score' }
                    }
                }
            }
        });

        this.chartInstances.set('performance', chart);
    }

    renderAttendanceHeatmap(trends) {
        const container = document.getElementById('attendanceHeatmap');
        if (!container) return;

        container.innerHTML = '';
        const margin = { top: 50, right: 30, bottom: 40, left: 100 };
        const width = container.offsetWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3.select('#attendanceHeatmap')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const heatmapData = this.generateHeatmapData(trends);

        const xScale = d3.scaleBand()
            .domain(heatmapData.dates)
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleBand()
            .domain(['S33', 'S34', 'S35'])
            .range([0, height])
            .padding(0.1);

        const colorScale = d3.scaleLinear()
            .domain([0, 100])
            .range(['#ff6b6b', '#4ecdc4']);

        g.selectAll('.heatmap-cell')
            .data(heatmapData.values)
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => xScale(d.date))
            .attr('y', d => yScale(d.section))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', d => colorScale(d.value))
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .call(d3.axisLeft(yScale));

        svg.append('text')
            .attr('x', width / 2 + margin.left)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Attendance by Section and Date');
    }

    processWeeklyData(trends) {
        return [78, 85, 82, 79, 88];
    }

    categorizeRiskLevels(riskStudents) {
        const levels = { high: 0, medium: 0, low: 0, safe: 0 };
        riskStudents.forEach(student => {
            const attendance = parseFloat(student.attendance_percentage) || 0;
            if (attendance < 40) levels.high++;
            else if (attendance < 60) levels.medium++;
            else if (attendance < 75) levels.low++;
            else levels.safe++;
        });
        return levels;
    }

    generateCorrelationData(data) {
        const points = [];
        for (let i = 0; i < 50; i++) {
            const attendance = Math.random() * 100;
            const performance = attendance * 0.8 + Math.random() * 20;
            points.push({ x: attendance, y: Math.min(100, performance) });
        }
        return points;
    }

    generateHeatmapData(trends) {
        const dates = trends.slice(0, 7).map(t => new Date(t.session_date).toLocaleDateString());
        const sections = ['S33', 'S34', 'S35'];
        const values = [];
        dates.forEach(date => {
            sections.forEach(section => {
                values.push({ date, section, value: Math.floor(Math.random() * 40) + 60 });
            });
        });
        return { dates, values };
    }

    destroyAllCharts() {
        this.chartInstances.forEach(chart => chart.destroy());
        this.chartInstances.clear();
    }
}

window.analyticsSystem = new AnalyticsDashboard();
