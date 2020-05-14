import { Source } from './Source.js';
import { getRandomColor } from '../main.js';

export class Channel extends Source {
	#getChartData;
	#getMinMax;
	#syncHandler;
	#scrollHandler;

	constructor(name, measuresCount, frequency, startTime, id, signalId) {
		super(measuresCount, frequency, startTime, id)
		this.name = name;
		this.signalId = signalId;
		this.chart;
		this.values = [];

		this.#syncHandler = function (e, channels) {
			channels.forEach((channel) => {
				const chart = channel.chart;
				const options = chart.options;
				if (!options.axisX) {
					options.axisX = {};
				}
				if (!options.axisY) {
					options.axisY = {};
				}
				if (e.trigger === "reset") {
					options.axisX.viewportMinimum = options.axisX.viewportMaximum = null;
					options.axisY.viewportMinimum = options.axisY.viewportMaximum = null;
					chart.render();
				} else {
					if (chart !== e.chart) {
						options.axisX.viewportMinimum = e.axisX[0].viewportMinimum;
						options.axisX.viewportMaximum = e.axisX[0].viewportMaximum;
						options.axisY.viewportMinimum = e.axisY[0].viewportMinimum;
						options.axisY.viewportMaximum = e.axisY[0].viewportMaximum;
						chart.render();
					}
				}
			})
		}

		this.#getChartData = function () {
			let data = [];
			let dataPoints = [];
			let step = this.recordingTime;
			for (let i = 0; i < this.values.length; i += 1) {
				dataPoints.push({
					x: new Date(step),
					y: this.values[i],
				});
				step += this.period;
			}
			let dataSeries = { type: 'line', color: getRandomColor() };
			dataSeries.dataPoints = dataPoints;
			data.push(dataSeries);
			return data;
		}

		this.#getMinMax = function (array) {
			let min = array[0], max = array[0];
			for (let i = 1; i < array.length; i++) {
				min = (array[i] < min) ? array[i] : min;
				max = (array[i] > max) ? array[i] : max;
			}
			return [min, max];
		}

		this.#scrollHandler = function (e, channels, range) {
			const classSelector = `.${this.signalId}-slider`;
			const trigger = e.trigger;
			const currentLeftValue = e.axisX[0].viewportMinimum;
			const start = this.recordingTime;
			const end = this.endTime - range;
			$(function () {
				if (trigger == 'reset') {
					if ($(classSelector).slider()) {
						$(classSelector).slider('destroy');
					}
				}
				if (trigger == 'zoom' || trigger == 'pan') {
					console.log(start, end)
					$(classSelector).slider({
						min: start,
						max: end,
						value: currentLeftValue,
						slide: function (e, ui) {
							const leftLimit = ui.value;
							const rightLimit = leftLimit + range;
							if (rightLimit > this.endTime) {
								return;
							};
							channels.forEach((channel) => {
								const currentAsixX = channel.chart.axisX[0];
								currentAsixX.set('viewportMinimum', leftLimit, false)
								currentAsixX.set('viewportMaximum', rightLimit);
							})
							$(classSelector).each(function () {
								$(this).slider('option', 'value', leftLimit);
							})
						}
					})
				}
			});
		}
	}

	renderChart(channels) {
		const chartData = this.#getChartData();
		const CHANNEL_BUTTON_HTML = `<button class="dropdown-item channel-btn" type="button" id="${this.id}">${this.name}</button>`;
		const [minimalPoint, maximalPoint] = this.#getMinMax(this.values);

		$(`#${this.signalId}`).append(CHANNEL_BUTTON_HTML);
		let chartDemo = new CanvasJS.Chart(`${this.id}`, {
			width: 200,
			height: 100,
			interactivityEnabled: false,
			title: {
				text: this.name,
			},
			axisY: {
				title: "",
				valueFormatString: " ",
				minimum: minimalPoint,
				maximum: maximalPoint
			},
			axisX: {
				title: "",
				valueFormatString: " "
			},
			data: chartData,
		})
		$('.channel-btn > div > .canvasjs-chart-canvas + .canvasjs-chart-canvas').css('position', '');
		chartDemo.render();
		$('article').append(`<div class="chartContainer mb-2" id="${this.id}-container"></div>`);
		this.chart =
			new CanvasJS.Chart(`${this.id}-container`, {
				width: 520,
				height: 325,
				animationEnabled: false,
				zoomEnabled: true,
				zoomType: 'x',
				rangeChanging: (e) => {
					const axisX = this.chart.axisX[0];
					const range = axisX.get('viewportMaximum') - axisX.get('viewportMinimum');
					this.#scrollHandler(e, channels, range);
				},
				rangeChanged: (e) => {
					this.#syncHandler(e, channels);
				},
				title: {
					text: this.name,
				},
				axisY: {
					includeZero: true,
					minimum: minimalPoint,
					maximum: maximalPoint
				},
				axisX: {
					includeZero: true,
				},
				data: chartData,
			})
		$(`#${this.id}-container > .canvasjs-chart-container`).after(`<div class="${this.signalId}-slider" id="${this.id}-slider"></div>`);
	}

	showChart() {
		this.chart.render();
		$(`#${this.id}-container`).css({
			'display': 'block',
			'background-color': getRandomColor(),
		});
	}
}