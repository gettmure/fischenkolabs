import { Signal } from './entities/Signal.js';
import { findElementById } from './main.js';

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

export function createModel(signals) {
  const modelType = $('#model-type').val();
  const signalId = $('.signal-choice').val();
  let parameters = Array.from(document.getElementsByClassName('parameter')).map(
    (parameter) => {
      if (parameter.value == '') {
        parameter.value = 0;
      }
      if (parameter.className.includes('set')) {
        return parameter.value.split(/[\s,]+/).map((coef) => parseFloat(coef));
      } else {
        return parseFloat(parameter.value);
      }
    }
  );
  const isRendered = signals.some((signal) => {
    return (
      signal.id == signalId &&
      signal.models.some((model) => {
        return (
          model.type == modelType &&
          arraysAreEqual(model.parameters, parameters)
        );
      }) &&
      signal.models.length != 0
    );
  });
  if (!isRendered) {
    let signal;
    if (signals.length == 0) {
      const measuresCount = parameters[0];
      const frequency = parameters[1];
      parameters = parameters.splice(2, parameters.length - 2);
      const unixtime = Date.parse('2000-01-01 00:00:00.000 GMT');
      signal = new Signal(
        `Пользовательский сигнал`,
        1,
        measuresCount,
        frequency,
        unixtime,
        `signal${signals.length}`
      );
      signals.push(signal);
      const SIGNALS_LIST_HTML =
        '<div class="form-group"><label for="signal-choice">Выберите сигнал</label><select class="form-control signal-choice"></select></div>';
      $('#options-container').before(SIGNALS_LIST_HTML);
      $('#measures-count').remove();
      $('#frequency').remove();
    } else {
      signal = findElementById(signals, signalId);
    }
    signal.renderModel(modelType, parameters);
  }
}

export function switchModelType(signals, type) {
  const signalId = $('#modelling-signal').val();
  const signal = findElementById(signals, signalId);
  const parametersContainer = $('#parameters-container');
  let PARAMETERS_HTML;
  const ADDITIONAL_PARAMETERS_HTML = `
    <div class="form-group"><label for="measures-count">Количество отсчётов (N)</label><input class="parameter form-control" id="measures-count" placeholder="N"></div><div class="form-group"><label for="frequency">Частота (f)</label><input class="parameter form-control" id="frequency" placeholder="f"></div>`;
  switch (type) {
    case 'Delayed single impulse': {
      let MAIN_PARAMETERS_HTML;
      if (signals.length == 0) {
        MAIN_PARAMETERS_HTML = `
          <label for="delay">Задержка импульса (N0): [1, N]</label><input class="parameter form-control" id="delay" placeholder="N0">`;
      } else {
        const DEFAULT_DELAY = signal.measuresCount / 2;
        MAIN_PARAMETERS_HTML = `
          <label for="delay">Задержка импульса (N0): [1, ${
            signal != undefined ? signal.measuresCount : 'N'
          }]</label><input class="parameter form-control" id="delay" value=${DEFAULT_DELAY} placeholder="N0">`;
      }
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Delayed single bounce': {
      let MAIN_PARAMETERS_HTML;
      if (signals.length == 0) {
        MAIN_PARAMETERS_HTML = `
          <label for="delay">Задержка скачка (N0): [1, N]</label><input class="parameter form-control" id="delay" placeholder="N0">`;
      } else {
        const DEFAULT_DELAY = signal.measuresCount / 2;
        MAIN_PARAMETERS_HTML = `
          <label for="delay">Задержка скачка (N0): [1, ${signal.measuresCount}]</label><input class="parameter form-control" id="delay" value=${DEFAULT_DELAY} placeholder="N0">`;
      }
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Decreasing discretized exponent': {
      const DEFAULT_BASE = 0.5;
      const MAIN_PARAMETERS_HTML = `
        <label for="base">Основание степени (a): a -> (0, 1)</label><input value=${DEFAULT_BASE} class="parameter form-control" id="base" placeholder="a">`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Discretized sinusoid': {
      const DEFAULT_AMPLITUDE = 1;
      const DEFAULT_CIRCULAR_FREQUENCY = 1.570796326;
      const DEFAULT_INITIAL_PHASE = 0;
      const MAIN_PARAMETERS_HTML = `
				<div class="form-group"><label for="amplitude">Амплитуда (a)</label><input value=${DEFAULT_AMPLITUDE} class="parameter form-control" id="amplitude" placeholder="a"></div>
				<div class="form-group"><label for="circular-frequency">Круговая частота (w): w -> [0, PI]</label><input value=${DEFAULT_CIRCULAR_FREQUENCY} class="parameter form-control" id="circular-frequency" placeholder="w"></div>
				<div class="form-group"><label for="initial-phase">Начальная фаза (phi): phi -> [0, 2*PI]</label><input value=${DEFAULT_INITIAL_PHASE} class="parameter form-control" id="initial-phase" placeholder="phi"></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Meander':
    case 'Saw': {
      const DEFAULT_PERIOD = 5;
      const MAIN_PARAMETERS_HTML = `
        <label for="period">Период (L)</label><input value=${DEFAULT_PERIOD} class="parameter form-control" id="period" placeholder="L">`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Exponential envelope': {
      const DEFAULT_AMPLITUDE = 1;
      const DEFAULT_ENVELOPE_WIDTH = 1;
      const DEFAULT_INITIAL_PHASE = 0;
      let PART;
      let MAIN_PARAMETERS_HTML;
      if (signals.length == 0) {
        PART = `
          <div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, 0.5*f]</label><input class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>`;
      } else {
        const DEFAULT_FREQUENCY = 0.5 * signal.frequency;
        PART = `
          <div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, ${
            0.5 * signal.frequency
          }]
          </label><input value=${DEFAULT_FREQUENCY} class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>`;
      }
      MAIN_PARAMETERS_HTML = `
			  <div class="form-group"><label for="amplitude">Амплитуда (a)</label><input value=${DEFAULT_AMPLITUDE} class="parameter form-control" id="amplitude" placeholder="a"></div>
			  <div class="form-group"><label for="envelope-width">Ширина огибающей (tao)</label><input value=${DEFAULT_ENVELOPE_WIDTH} class="parameter form-control" id="envelope-width" placeholder="tao"></div>
			  ${PART}
			  <div class="form-group"><label for="initial-phase">Начальная фаза несущей (phi)</label><input value=${DEFAULT_INITIAL_PHASE} class="parameter form-control" id="initial-phase" placeholder="phi"></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Balance envelope': {
      const DEFAULT_AMPLITUDE = 1;
      const DEFAULT_ENVELOPE_FREQUENCY = 1;
      const DEFAULT_INITIAL_PHASE = 0;
      let PART;
      let MAIN_PARAMETERS_HTML;
      if (signals.length == 0) {
        PART = `
          <div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, 0.5*f]</label><input class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>`;
      } else {
        const DEFAULT_CARRIER_FREQUENCY = (0.5 * signal.frequency) / 2;
        PART = `
          <div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, ${
            0.5 * signal.frequency
          }]
          </label><input value=${DEFAULT_CARRIER_FREQUENCY} class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>`;
      }
      MAIN_PARAMETERS_HTML = `
			  <div class="form-group"><label for="amplitude">Амплитуда (a)</label><input value=${DEFAULT_AMPLITUDE} class="parameter form-control" id="amplitude" placeholder="a"></div>
			  <div class="form-group"><label for="envelope-frequency">Частота огибающей (fо)</label><div class="form-group"><input value=${DEFAULT_ENVELOPE_FREQUENCY} class="parameter form-control" id="envelope-frequency" placeholder="fо"></div>
			  ${PART}
			  <div class="form-group"><label for="initial-phase">Начальная фаза несущей (phi)</label><input value=${DEFAULT_INITIAL_PHASE} class="parameter form-control" id="initial-phase" placeholder="phi"></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'Tonal envelope': {
      const DEFAULT_AMPLITUDE = 1;
      const DEFAULT_ENVELOPE_FREQUENCY = 1;
      const DEFAULT_INITIAL_PHASE = 0;
      const DEFAULT_DEPTH_INDEX = 0.5;
      let PART;
      if (signals.length == 0) {
        PART =
          '<div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, 0.5*f]</label><input class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>';
      } else {
        const DEFAULT_CARRIER_FREQUENCY = (0.5 * signal.frequency) / 2;
        PART = `
          <div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, ${
            0.5 * signal.frequency
          }]
          </label><input value=${DEFAULT_CARRIER_FREQUENCY} class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>`;
      }
      const MAIN_PARAMETERS_HTML = `
			  <div class="form-group"><label for="amplitude">Амплитуда (a)</label><input value=${DEFAULT_AMPLITUDE} class="parameter form-control" id="amplitude" placeholder="a"></div>
			  <div class="form-group"><label for="envelope-frequency">Частота огибающей (fо)</label><div class="form-group"><input value=${DEFAULT_ENVELOPE_FREQUENCY} class="parameter form-control" id="envelope-frequency" placeholder="fо"></div>
			  ${PART}
			  <div class="form-group"><label for="initial-phase">Начальная фаза несущей (phi)</label><input value=${DEFAULT_INITIAL_PHASE} class="parameter form-control" id="initial-phase" placeholder="phi"></div>
			  <div class="form-group"><label for="depth-inde">Глубина модуляции (m): m -> [0, 1]</label><input value=${DEFAULT_DEPTH_INDEX} class="parameter form-control" id="depth-index" placeholder="m"></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'White noise (interval)': {
      const MAIN_PARAMETERS_HTML = `
			  <div class="form-group"><label for="interval">Интервал [a, b]</label><input class="parameter form-control set" id="interval" placeholder="[a, b]"></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'White noise (normal law)': {
      const MAIN_PARAMETERS_HTML = `
			  <div class="form-group"><label for="alpha">Среднее (альфа)</label><input class="parameter form-control" id="alpha" placeholder="a"></div>
			  <div class="form-group"><label for="sigma">Дисперсия (сигма^2)</label><input class="parameter form-control" id="sigma" placeholder="Сигма^2"></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
    case 'АРСС': {
      const MAIN_PARAMETERS_HTML = `
        <div class="form-group"><label for="sigma">Дисперсия (сигма^2)</label><input class="parameter form-control" id="sigma" placeholder="Сигма^2"></div>
			  <div class="form-group"><label for="a-coef">Множество коэффициентов a</label><input class="parameter form-control set" id="a-coef" placeholder="1, 2, ..."></div>
			  <div class="form-group"><label for="b-coef">Множество коэффициентов b</label><input class="parameter form-control set" id="b-coef" placeholder="1, 2, ..."></div>`;
      PARAMETERS_HTML = MAIN_PARAMETERS_HTML;
      break;
    }
  }
  if (signals.length == 0) {
    PARAMETERS_HTML = ADDITIONAL_PARAMETERS_HTML + PARAMETERS_HTML;
  }
  parametersContainer.html(PARAMETERS_HTML);
}

export function showModellingWindow(signals, buttonId) {
  const ADDITIONAL_PARAMETERS_HTML = `
    <div class="form-group"><label for="measures-count">Количество отсчётов (N)</label><input class="parameter form-control" id="measures-count" placeholder="N"></div><div class="form-group"><label for="frequency">Частота (f)</label><input class="parameter form-control" id="frequency" placeholder="f"></div>`;
  let DEFAULT_PARAMETERS_HTML;
  switch (buttonId) {
    case 'determinated-signal-btn': {
      let defaultDelay;
      signals.length == 0
        ? (defaultDelay = 'N')
        : (defaultDelay = signals[0].measuresCount);
      DEFAULT_PARAMETERS_HTML = `
        <label for="delay">Задержка импульса (N0): [1, ${defaultDelay}]</label><input class="parameter form-control" id="delay" placeholder="N0">`;
      const MODEL_TYPE_ITEMS_HTML = `
				<option value="Delayed single impulse">Задержанный единичный импульс</option>
				<option value="Delayed single bounce">Задержанный единичный скачок</option>
				<option value="Decreasing discretized exponent">Дискретизированная убывающая
					экспонента
				</option>
				<option value="Discretized sinusoid">Дискретизированная синусоида</option>
				<option value="Meander">"Меандр" (прямоугольная решетка)</option>
				<option value="Saw">“Пила"</option>`;
      $('#model-type').html(MODEL_TYPE_ITEMS_HTML);
      break;
    }
    case 'uninterrupted-signal-btn': {
      let defaultCarrierFrequency;
      signals.length == 0
        ? (defaultCarrierFrequency = '0.5*f')
        : (defaultCarrierFrequency = 0.5 * signals[0].frequency);
      DEFAULT_PARAMETERS_HTML = `
			  <div class="form-group"><label for="amplitude">Амплитуда (a)</label><input value="1" class="parameter form-control" id="amplitude" placeholder="a"></div>
			  <div class="form-group"><label for="envelope-width">Ширина огибающей (tao)</label><input value="1" class="parameter form-control" id="envelope-width" placeholder="tao"></div>
			  <div class="form-group"><label for="carrier-frequency">Частота несущей (fн): fн -> [0, ${defaultCarrierFrequency}]</label><input class="parameter form-control" id="carrier-frequency" placeholder="fн"></div>
			  <div class="form-group"><label for="initial-phase">Начальная фаза несущей (phi)</label><input value="0" class="parameter form-control" id="initial-phase" placeholder="phi"></div>`;
      const MODEL_TYPE_ITEMS_HTML = `
				<option value="Exponential envelope">Экспоненциальная огибающая</option>
				<option value="Balance envelope">Балансная огибающая</option>
				<option value="Tonal envelope">Тональная огибающая</option>
			`;
      $('#model-type').html(MODEL_TYPE_ITEMS_HTML);
      break;
    }
    case 'random-signal-btn': {
      DEFAULT_PARAMETERS_HTML = `
			  <div class="form-group"><label for="interval">Интервал [a, b]</label><input class="parameter form-control set" id="interval" placeholder="[a, b]"></div>`;
      const MODEL_TYPE_ITEMS_HTML = `
				<option value="White noise (interval)">Сигнал белого шума (равномерное распределение)</option>
				<option value="White noise (normal law)">Сигнал белого шума (нормальный закон распределения)</option>
				<option value="АРСС">АРСС</option>
			`;
      $('#model-type').html(MODEL_TYPE_ITEMS_HTML);
      break;
    }
  }
  if (signals.length == 0) {
    DEFAULT_PARAMETERS_HTML =
      ADDITIONAL_PARAMETERS_HTML + DEFAULT_PARAMETERS_HTML;
  }
  $('#parameters-container').html(DEFAULT_PARAMETERS_HTML);
}

export function createSuperpositionButtons(signal) {
  let SOURCES_HTML = '';
  signal.channels.forEach((channel) => {
    SOURCES_HTML += `
    <div class="form-group"><label for="${channel.id}-coef">${channel.name}</label>
    <input class="coef form-control" id="${channel.id}-coef" placeholder=""></div>`;
  });
  signal.models.forEach((model) => {
    SOURCES_HTML += `
    <div class="form-group"><label for="${model.id}-coef">${model.name}</label>
    <input class="coef form-control" id="${model.id}-coef" placeholder=""></div>`;
  });
  $('#superposition-channels-container').html(SOURCES_HTML);
}

export function createSuperposition(signal) {
  const selectedSources = Array.from(document.getElementsByClassName('coef'))
    .filter((element) => {
      return element.value != '';
    })
    .map((element) => {
      const splittedId = element.id.split('-');
      return {
        id:
          element.id.match(/model/gm) == null
            ? splittedId[0]
            : `${splittedId[0]}-${splittedId[1]}`,
        value: parseFloat(element.value),
      };
    });
  signal.renderSuperposition(selectedSources);
}
