import { LightingManager, TimeOfDay } from '../environment/lighting-manager';
import './time-controller.css';

export class TimeController {
  private container: HTMLElement;
  private slider: HTMLInputElement;
  private timeDisplay: HTMLDivElement;
  private timeButtons: Map<TimeOfDay, HTMLButtonElement> = new Map();
  private speedButtons: Map<number, HTMLButtonElement> = new Map();
  private lightingManager: LightingManager;
  private currentSpeedSetting: number = 300; // 1x por padrão
  
  constructor(lightingManager: LightingManager) {
    this.lightingManager = lightingManager;
    
    // Criar container principal
    this.container = document.createElement('div');
    this.container.className = 'time-controller';
    document.body.appendChild(this.container);
    
    // Criar título
    const title = document.createElement('h3');
    title.textContent = 'Controle de Tempo';
    this.container.appendChild(title);
    
    // Criar slider de tempo
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = '1';
    this.slider.step = '0.01';
    this.slider.value = this.lightingManager.getDayProgress().toString();
    this.container.appendChild(this.slider);
    
    // Criar display de tempo
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.className = 'time-display';
    this.container.appendChild(this.timeDisplay);
    
    // Criar buttons de tempo do dia
    const timeButtonsContainer = document.createElement('div');
    timeButtonsContainer.className = 'buttons-container';
    this.container.appendChild(timeButtonsContainer);
    
    // Primeiro grupo: Manhã, Meio-dia, Tarde
    const dayTimeButtons = document.createElement('div');
    dayTimeButtons.className = 'button-group';
    timeButtonsContainer.appendChild(dayTimeButtons);
    
    // Segundo grupo: Entardecer, Noite, Amanhecer
    const nightTimeButtons = document.createElement('div');
    nightTimeButtons.className = 'button-group';
    timeButtonsContainer.appendChild(nightTimeButtons);
    
    // Criar botões para cada período do dia
    const timeMap = [
      { time: TimeOfDay.MORNING, label: 'Manhã', group: dayTimeButtons },
      { time: TimeOfDay.NOON, label: 'Meio-dia', group: dayTimeButtons },
      { time: TimeOfDay.AFTERNOON, label: 'Tarde', group: dayTimeButtons },
      { time: TimeOfDay.EVENING, label: 'Entardecer', group: nightTimeButtons },
      { time: TimeOfDay.NIGHT, label: 'Noite', group: nightTimeButtons },
      { time: TimeOfDay.DAWN, label: 'Amanhecer', group: nightTimeButtons }
    ];
    
    timeMap.forEach(item => {
      const button = document.createElement('button');
      button.textContent = item.label;
      button.setAttribute('data-time', TimeOfDay[item.time]);
      
      this.timeButtons.set(item.time, button);
      item.group.appendChild(button);
      
      // Adicionar event listener para cada botão
      button.addEventListener('click', () => {
        console.log(`Clicou no botão ${item.label}`);
        this.lightingManager.setTimeOfDay(item.time);
        this.updateButtonHighlight();
        this.updateDisplay();
      });
    });
    
    // Criar controles de velocidade
    const speedTitle = document.createElement('h3');
    speedTitle.textContent = 'Velocidade do Tempo';
    this.container.appendChild(speedTitle);
    
    const speedButtonsContainer = document.createElement('div');
    speedButtonsContainer.className = 'speed-buttons';
    this.container.appendChild(speedButtonsContainer);
    
    const speeds = [
      { label: '1x', value: 300 },
      { label: '2x', value: 150 },
      { label: '4x', value: 75 },
      { label: 'Parar', value: 0 }
    ];
    
    speeds.forEach(speed => {
      const button = document.createElement('button');
      button.textContent = speed.label;
      button.setAttribute('data-speed', speed.value.toString());
      
      this.speedButtons.set(speed.value, button);
      speedButtonsContainer.appendChild(button);
      
      button.addEventListener('click', () => {
        console.log(`Alterando velocidade para: ${speed.label} (${speed.value})`);
        this.currentSpeedSetting = speed.value;
        this.lightingManager.setDayDuration(speed.value);
        this.updateButtonHighlight();
      });
    });
    
    // Configurar event listener para o slider
    this.slider.addEventListener('input', () => {
      const value = parseFloat(this.slider.value);
      console.log(`Ajustando progresso do dia para: ${value}`);
      this.lightingManager.setDayProgress(value);
      this.updateDisplay();
    });
    
    // Ativar o botão de velocidade 1x por padrão
    this.updateButtonHighlight();
    
    // Iniciar atualização da interface
    this.updateDisplay();
    setInterval(() => this.updateDisplay(), 500);
    
    console.log("Controlador de tempo inicializado com sucesso");
  }
  
  // Atualiza a exibição de tempo e o estado dos botões
  private updateDisplay(): void {
    // Atualizar o slider sem disparar o evento input
    const currentProgress = this.lightingManager.getDayProgress();
    if (this.slider.value !== currentProgress.toString()) {
      this.slider.value = currentProgress.toString();
    }
    
    // Atualizar display de tempo (converte para horas e minutos)
    const hours = Math.floor(currentProgress * 24);
    const minutes = Math.floor((currentProgress * 24 * 60) % 60);
    this.timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Atualizar destaque dos botões
    this.updateButtonHighlight();
  }
  
  // Atualiza o destaque visual dos botões com base no estado atual
  private updateButtonHighlight(): void {
    // Destacar botão do período atual
    const currentTimeOfDay = this.lightingManager.getTimeOfDay();
    
    this.timeButtons.forEach((button, time) => {
      if (time === currentTimeOfDay) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Destacar botão de velocidade atual
    const currentDuration = this.lightingManager.isPausedState() ? 0 : this.currentSpeedSetting;
    
    this.speedButtons.forEach((button, speed) => {
      if (speed === currentDuration) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }
}