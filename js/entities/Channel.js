import { Source } from './Source.js';
import { getRandomColor } from '../main.js';

export class Channel extends Source {
  #getChartData;
  #getMinMax;
  #syncHandler;
  #scrollHandler;
  #middle;
  #dispersion;
  #deviation;
  #statisticsSum;
  #variationCoef;
  #asymmetryCoef;
  #excessCoef;
  #calculateQuantile;
  #calculateStatistics;

  constructor(name, measuresCount, frequency, startTime, id, signalId) {
    super(measuresCount, frequency, startTime, id);
    this.name = name;
    this.signalId = signalId;
    this.demoChart;
    this.chart;
    this.values = [];
    this.minimalValue;
    this.maximalValue;

    this.#statisticsSum = (power) => {
      let denominator;
      power == 2
        ? (denominator = 1)
        : (denominator = Math.pow(this.#deviation, power));
      return (
        this.values.reduce(
          (previousValue, currentValue) =>
            previousValue + Math.pow(currentValue - this.#middle, power)
        ) /
        (this.measuresCount * denominator)
      );
    };

    this.#calculateStatistics = () => {
      this.#middle =
        this.values.reduce(
          (previousValue, currentValue) => previousValue + currentValue
        ) / this.measuresCount;
      this.#dispersion = this.#statisticsSum(2);
      this.#deviation = Math.sqrt(this.#dispersion);
      this.#variationCoef = this.#deviation / this.#middle;
      this.#asymmetryCoef = this.#statisticsSum(3);
      this.#excessCoef = this.#statisticsSum(4) - 3;
    };

    this.#calculateQuantile = (order) => {
      const index = Math.trunc(order * this.measuresCount);
      return this.values.sort((a, b) => a - b)[index];
    };

    this.#syncHandler = (e, channels) => {
      channels.forEach((channel) => {
        const chart = channel.chart;
        const options = chart.options;
        if (!options.axisX) {
          options.axisX = {};
        }
        if (!options.axisY) {
          options.axisY = {};
        }
        if (e.trigger === 'reset') {
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
      });
    };

    this.#getChartData = () => {
      let data = [];
      let dataPoints = [];
      let step = this.recordingTime;
      for (let i = 0; i < this.measuresCount; i += 1) {
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
    };

    this.#getMinMax = (array) => {
      let min = array[0],
        max = array[0];
      for (let i = 1; i < array.length; i++) {
        min = array[i] < min ? array[i] : min;
        max = array[i] > max ? array[i] : max;
      }
      this.minimalValue = min;
      this.maximalValue = max;
    };

    this.#scrollHandler = (e, channels, range) => {
      const classSelector = this._getSelector();
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
          $(classSelector).slider({
            min: start,
            max: end,
            value: currentLeftValue,
            slide: function (e, ui) {
              const leftLimit = ui.value;
              const rightLimit = leftLimit + range;
              if (rightLimit > this.endTime) {
                return;
              }
              channels.forEach((channel) => {
                const currentAsixX = channel.chart.axisX[0];
                currentAsixX.set('viewportMinimum', leftLimit, false);
                currentAsixX.set('viewportMaximum', rightLimit);
              });
              $(classSelector).each(function () {
                $(this).slider('option', 'value', leftLimit);
              });
            },
          });
        }
      });
    };
  }

  renderChart(channels) {
    const chartData = this.#getChartData();
    const CHANNEL_BUTTON_HTML = `
      <button class="dropdown-item channel-btn" type="button" id="${this.id}">${this.name}</button>`;
    this.#getMinMax(this.values);
    $(`#${this.signalId}`).append(CHANNEL_BUTTON_HTML);
    this.demoChart = new CanvasJS.Chart(`${this.id}`, {
      width: 200,
      height: 100,
      interactivityEnabled: false,
      title: {
        text: this.name,
      },
      axisY: {
        title: '',
        valueFormatString: ' ',
        minimum: this.minimalValue,
        maximum: this.maximalValue,
      },
      axisX: {
        title: '',
        valueFormatString: ' ',
      },
      data: chartData,
    });
    $(
      '.channel-btn > div > .canvasjs-chart-canvas + .canvasjs-chart-canvas'
    ).css('position', '');
    this.demoChart.render();
    $('article').append(
      `<div class="chartContainer mb-2" id="${this.id}-container"></div>`
    );
    this.chart = new CanvasJS.Chart(`${this.id}-container`, {
      width: 520,
      height: 325,
      animationEnabled: false,
      zoomEnabled: true,
      zoomType: 'x',
      rangeChanging: (e) => {
        const axisX = this.chart.axisX[0];
        const range =
          axisX.get('viewportMaximum') - axisX.get('viewportMinimum');
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
        minimum: this.minimalValue,
        maximum: this.maximalValue,
      },
      axisX: {
        includeZero: true,
      },
      data: chartData,
    });
    this._createScroll();
  }

  showChart() {
    this.chart.render();
    $(`#${this.id}-container`).css({
      display: 'block',
      'background-color': getRandomColor(),
    });
  }

  renderStatistics(intervalsCount) {
    this.#calculateStatistics();
    let data = [];
    let dataPoints = [];
    let barData = [];
    barData.length = intervalsCount;
    barData.fill(0);
    const width = (this.maximalValue - this.minimalValue) / intervalsCount;
    this.values.forEach((value) => {
      const index = Math.trunc((value - this.minimalValue) / width);
      if (index == 0) {
        barData[0]++;
      } else {
        barData[index - 1]++;
      }
    });
    for (let i = 0; i < intervalsCount; i += 1) {
      dataPoints.push({
        x: i + 1,
        y: barData[i],
      });
    }
    let dataSeries = { type: 'column', color: '#000000' };
    dataSeries.dataPoints = dataPoints;
    data.push(dataSeries);

    const chart = new CanvasJS.Chart('bar-chart', {
      width: 400,
      height: 200,
      interactivityEnabled: false,
      axisY: {
        title: '',
        valueFormatString: ' ',
      },
      axisX: {
        title: '',
        valueFormatString: ' ',
      },
      data: data,
    });
    $('#options-container').css('display', 'none');
    $('#statistics-container').css('display', 'flex');
    $('#middle').html(`Среднее = ${this.#middle}`);
    $('#dispersion').html(`Дисперсия = ${this.#dispersion}`);
    $('#deviation').html(`Ср. кв. откл = ${this.#deviation}`);
    $('#variationCoef').html(`Вариация = ${this.#variationCoef}`);
    $('#asymmetryCoef').html(`Асимметрия = ${this.#asymmetryCoef}`);
    $('#excessCoef').html(`Эксцесс = ${this.#excessCoef}`);
    $('#max-value').html(`Максимум = ${this.maximalValue}`);
    $('#min-value').html(`Минимум = ${this.minimalValue}`);
    $('#quantile005').html(
      `Квантиль порядка 0.05 = ${this.#calculateQuantile(0.05)}`
    );
    $('#quantile095').html(
      `Квантиль порядка 0.95 = ${this.#calculateQuantile(0.95)}`
    );
    $('#median').html(`Медиана = ${this.#calculateQuantile(0.5)}`);
    chart.render();
  }

  renderSpectral(L) {
    let dpf = [0];
    for (let k = 1; k < this.measuresCount / 2; k++) {
      const complexRe = this.values.reduce(
        (previousValue, currentValue, index) =>
          previousValue +
          currentValue *
            Math.cos((-2 * Math.PI * k * index) / this.measuresCount)
      );
      const complexIm = this.values.reduce(
        (previousValue, currentValue, index) =>
          previousValue +
          currentValue *
            Math.sin((-2 * Math.PI * k * index) / this.measuresCount)
      );
      const value = {
        real: complexRe,
        imaginary: complexIm,
      };
      dpf.push(value);
    }
    const amplitudeSpectre = dpf
      .map((value) => {
        Math.sqrt(value.real * value.real + value.imaginary * value.imaginary);
      })
      .pop();
    const spm = amplitudeSpectre.map((value) => value * value);
  }

  _createScroll() {
    $(`#${this.id}-container`).append(
      `<div class="slider-container"><div class="${this.signalId}-slider" id="${this.id}-slider"></div></div>`
    );
  }

  _getSelector() {
    return `.${this.signalId}-slider`;
  }
}
