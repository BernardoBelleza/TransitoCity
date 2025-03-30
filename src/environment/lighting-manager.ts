import * as THREE from 'three';
import { GameConfig } from '../config/game-config';

export enum TimeOfDay {
  DAWN,
  MORNING,
  NOON,
  AFTERNOON,
  EVENING,
  NIGHT
}

export class LightingManager {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;
  
  // Variáveis de controle de tempo
  private timeElapsed: number = 0;
  private dayDuration: number = 300; // 5 minutos por padrão
  private dayProgress: number = 0.3; // Começar de manhã
  private isPaused: boolean = false;
  private manuallySet: boolean = false;
  private manualOverrideTimeout: number | null = null;
  private lastTimeUpdate: number = 0;
  private readonly UPDATE_INTERVAL: number = 15 * 60 * 1000; // 15 minutos em milissegundos
  
  // Constantes de horário (em formato de 24 horas)
  private readonly SUNRISE_TIME: number = 6.55; // 6:33 em formato decimal
  private readonly SUNSET_TIME: number = 18.4; // 18:24 em formato decimal
  
  // Referências para elementos visuais do céu
  private sunSphere: THREE.Mesh;
  private moonSphere: THREE.Mesh;
  private stars: THREE.Points;

  // Lista de listeners para mudanças de tempo
  private timeChangeListeners: Array<() => void> = [];
  
  // Multiplicador de intensidade de luz
  private lightIntensityMultiplier: number = 1.0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Configurar luz ambiente
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(this.ambientLight);
    
    // Configurar luz hemisférica
    this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x505050, 0.6);
    scene.add(this.hemisphereLight);
    
    // Configurar luz direcional para o sol
    this.sunLight = new THREE.DirectionalLight(0xffffee, 1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -25;
    this.sunLight.shadow.camera.right = 25;
    this.sunLight.shadow.camera.top = 25;
    this.sunLight.shadow.camera.bottom = -25;
    scene.add(this.sunLight);
    
    // Configurar luz direcional para a lua
    this.moonLight = new THREE.DirectionalLight(0xaabbff, 0.3);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 1024;
    this.moonLight.shadow.mapSize.height = 1024;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 50;
    this.moonLight.shadow.camera.left = -25;
    this.moonLight.shadow.camera.right = 25;
    this.moonLight.shadow.camera.top = 25;
    this.moonLight.shadow.camera.bottom = -25;
    this.moonLight.intensity = 0; // Começa desligada
    scene.add(this.moonLight);
    
    // Criar representação visual do sol
    const sunGeometry = new THREE.SphereGeometry(5, 16, 8);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff99,
      transparent: true,
      fog: false
    });
    this.sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(this.sunSphere);
    
    // Criar representação visual da lua
    const moonGeometry = new THREE.SphereGeometry(3, 16, 8);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.8,
      fog: false
    });
    this.moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(this.moonSphere);
    
    // Criar estrelas (visíveis apenas à noite)
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    
    for (let i = 0; i < 1000; i++) {
      const x = THREE.MathUtils.randFloatSpread(1000);
      const y = Math.random() * 300 + 100;
      const z = THREE.MathUtils.randFloatSpread(1000);
      starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0,
      fog: false
    });
    
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(this.stars);
    
    // Configurar hora inicial
    this.syncWithBrasiliaTime(); // Inicializar com horário real
    this.lastTimeUpdate = Date.now();
    
    console.log("Sistema de iluminação inicializado com horário de Brasília");
  }
  
  // Converte hora do dia (formato 24h) para progresso do dia (0-1)
  private hourToProgress(hour: number): number {
    return hour / 24;
  }
  
  // Converte progresso do dia (0-1) para hora do dia (formato 24h)
  public progressToHour(progress: number): number {
    return progress * 24;
  }
  
  // Método para definir o período do dia
  public setTimeOfDay(time: TimeOfDay): void {
    // Mapear o período para um valor de hora do dia
    switch (time) {
      case TimeOfDay.DAWN:
        this.dayProgress = this.hourToProgress(this.SUNRISE_TIME - 0.5); // 30 minutos antes do nascer do sol
        break;
      case TimeOfDay.MORNING:
        this.dayProgress = this.hourToProgress(8); // 8:00
        break;
      case TimeOfDay.NOON:
        this.dayProgress = this.hourToProgress(12); // 12:00
        break;
      case TimeOfDay.AFTERNOON:
        this.dayProgress = this.hourToProgress(15); // 15:00
        break;
      case TimeOfDay.EVENING:
        this.dayProgress = this.hourToProgress(this.SUNSET_TIME - 0.5); // 30 minutos antes do pôr do sol
        break;
      case TimeOfDay.NIGHT:
        this.dayProgress = this.hourToProgress(22); // 22:00
        break;
    }
    
    // Marcar como definido manualmente
    this.manuallySet = true;
    
    // Limpar qualquer timeout anterior
    if (this.manualOverrideTimeout !== null) {
      clearTimeout(this.manualOverrideTimeout);
    }
    
    // Permitir que o ciclo automático volte após 10 segundos
    this.manualOverrideTimeout = window.setTimeout(() => {
      this.manuallySet = false;
      this.manualOverrideTimeout = null;
      console.log("Retornando ao ciclo automático de dia/noite");
    }, 10000);
    
    // Atualizar o cenário
    this.updateLighting();
    
    console.log(`Período do dia definido manualmente para: ${TimeOfDay[time]} (progresso: ${this.dayProgress}, hora: ${this.progressToHour(this.dayProgress).toFixed(2)})`);
  }
  
  // Método para definir o progresso do dia diretamente
  public setDayProgress(progress: number): void {
    this.dayProgress = progress;
    
    // Marcar como definido manualmente
    this.manuallySet = true;
    
    // Limpar qualquer timeout anterior
    if (this.manualOverrideTimeout !== null) {
      clearTimeout(this.manualOverrideTimeout);
    }
    
    // Permitir que o ciclo automático volte após 10 segundos
    this.manualOverrideTimeout = window.setTimeout(() => {
      this.manuallySet = false;
      this.manualOverrideTimeout = null;
      console.log("Retornando ao ciclo automático de dia/noite");
    }, 10000);
    
    // Atualizar o cenário
    this.updateLighting();
    
    const hourOfDay = this.progressToHour(progress);
    console.log(`Progresso do dia definido manualmente para: ${progress} (hora: ${hourOfDay.toFixed(2)})`);
  }
  
  // Método para obter o progresso do dia atual
  public getDayProgress(): number {
    return this.dayProgress;
  }
  
  // Método para definir a duração do dia
  public setDayDuration(seconds: number): void {
    if (seconds === 0) {
      // Pausar a rotação do tempo
      this.isPaused = true;
      console.log("Rotação do tempo pausada");
    } else {
      // Desativar a pausa e definir a nova duração
      this.isPaused = false;
      this.dayDuration = seconds;
      console.log(`Duração do dia definida para: ${seconds} segundos`);
    }
  }
  
  // Método para verificar se o tempo está pausado
  public isPausedState(): boolean {
    return this.isPaused;
  }
  
  // Método para obter o período atual
  public getTimeOfDay(): TimeOfDay {
    const hourOfDay = this.progressToHour(this.dayProgress);
    
    // Horários específicos para cada período
    if (hourOfDay >= this.SUNRISE_TIME - 1 && hourOfDay < this.SUNRISE_TIME) return TimeOfDay.DAWN;
    if (hourOfDay >= this.SUNRISE_TIME && hourOfDay < 10) return TimeOfDay.MORNING;
    if (hourOfDay >= 10 && hourOfDay < 14) return TimeOfDay.NOON;
    if (hourOfDay >= 14 && hourOfDay < this.SUNSET_TIME - 1) return TimeOfDay.AFTERNOON;
    if (hourOfDay >= this.SUNSET_TIME - 1 && hourOfDay < this.SUNSET_TIME + 0.5) return TimeOfDay.EVENING;
    return TimeOfDay.NIGHT;
  }
  
  // Método para obter o horário do nascer do sol
  public getSunriseTime(): number {
    return this.SUNRISE_TIME;
  }

  // Método para obter o horário do pôr do sol
  public getSunsetTime(): number {
    return this.SUNSET_TIME;
  }

  // Método para verificar se é dia ou noite
  public isDaytime(): boolean {
    const hourOfDay = this.getDayProgress() * 24;
    return hourOfDay >= this.SUNRISE_TIME && hourOfDay <= this.SUNSET_TIME;
  }

  // Método para notificar mudanças de tempo
  public onTimeChanged(callback: () => void): void {
    this.timeChangeListeners.push(callback);
  }
  
  // Método chamado a cada frame para atualizar o sistema
  public update(deltaTime: number): void {
    // Se estiver em pausa ou definido manualmente, não atualizar
    if (this.isPaused || this.manuallySet) return;
    
    const currentTime = Date.now();
    
    // Verificar se passaram 15 minutos desde a última atualização
    if (currentTime - this.lastTimeUpdate >= this.UPDATE_INTERVAL) {
      // Sincronizar com o horário de Brasília
      this.syncWithBrasiliaTime();
      this.lastTimeUpdate = currentTime;
    }
  }
  
  // Método para atualizar a iluminação com base no progresso do dia
  public updateLighting(): void {
    const hourOfDay = this.progressToHour(this.dayProgress);
    const isDaytime = hourOfDay >= this.SUNRISE_TIME && hourOfDay < this.SUNSET_TIME;
    
    // Calcular o ângulo do sol - ajustado para nascer e pôr do sol específicos
    // Mapeie o horário do dia para um ângulo de 0 a 180 graus (nascer do sol a pôr do sol)
    let sunAngle = 0;
    
    if (isDaytime) {
      // Definir meio-dia exato
      const midday = 12.0;
      
      // Calcular ângulo baseado na relação com o meio-dia
      if (hourOfDay <= midday) {
        // Manhã até meio-dia
        const progress = (hourOfDay - this.SUNRISE_TIME) / (midday - this.SUNRISE_TIME);
        sunAngle = progress * (Math.PI / 2); // 0 a π/2
      } else {
        // Meio-dia até pôr do sol
        const progress = (hourOfDay - midday) / (this.SUNSET_TIME - midday);
        sunAngle = (Math.PI / 2) + progress * (Math.PI / 2); // π/2 a π
      }
    } else if (hourOfDay < this.SUNRISE_TIME) {
      // Antes do nascer do sol (entre meia-noite e o nascer do sol)
      // Sun below horizon, angle between 180 and 360
      const nightProgress = hourOfDay / this.SUNRISE_TIME;
      sunAngle = Math.PI + nightProgress * Math.PI;
    } else {
      // Após o pôr do sol (entre o pôr do sol e meia-noite)
      // Sun below horizon, angle between 180 and 360
      const nightProgress = (hourOfDay - this.SUNSET_TIME) / (24 - this.SUNSET_TIME);
      sunAngle = Math.PI + nightProgress * Math.PI;
    }
    
    // Calcular a posição do sol
    const sunDistance = 100;
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = Math.sin(sunAngle) * sunDistance;
    
    // Posicionar o sol e sua luz
    this.sunSphere.position.set(sunX, sunY, 0);
    this.sunLight.position.copy(this.sunSphere.position);
    
    // A lua está no lado oposto do céu
    this.moonSphere.position.set(-sunX, -sunY, 0);
    this.moonLight.position.copy(this.moonSphere.position);
    
    // Ajustar intensidades das luzes
    const sunHeight = sunY / sunDistance; // Normalizado entre -1 e 1
    
    let sunIntensity = 0;
    let moonIntensity = 0;
    let ambientIntensity = 0;
    
    if (isDaytime) {
      // Durante o dia
      sunIntensity = Math.max(0.1, sunHeight);
      moonIntensity = 0;
      ambientIntensity = 0.3 + 0.2 * sunHeight;
    } else {
      // Durante a noite
      sunIntensity = 0;
      moonIntensity = 0.3;
      ambientIntensity = 0.1;
    }
    
    // Nascer e pôr do sol (transições)
    if (Math.abs(hourOfDay - this.SUNRISE_TIME) < 0.5) {
      // Nascer do sol - transição suave
      const t = 1 - Math.abs(hourOfDay - this.SUNRISE_TIME) * 2; // 0-1
      sunIntensity = t * 0.7;
      moonIntensity = (1 - t) * 0.2;
      ambientIntensity = 0.1 + t * 0.2;
    } else if (Math.abs(hourOfDay - this.SUNSET_TIME) < 0.5) {
      // Pôr do sol - transição suave
      const t = 1 - Math.abs(hourOfDay - this.SUNSET_TIME) * 2; // 0-1
      sunIntensity = t * 0.7;
      moonIntensity = (1 - t) * 0.2;
      ambientIntensity = 0.1 + t * 0.2;
    }
    
    // Aplicar intensidades
    this.sunLight.intensity = sunIntensity * this.lightIntensityMultiplier;
    this.moonLight.intensity = moonIntensity * this.lightIntensityMultiplier;
    this.ambientLight.intensity = ambientIntensity * this.lightIntensityMultiplier;
    
    // Visibilidade dos astros
    (this.sunSphere.material as THREE.MeshBasicMaterial).opacity = isDaytime ? 0.9 : 0;
    (this.moonSphere.material as THREE.MeshBasicMaterial).opacity = !isDaytime ? 0.8 : 0;
    (this.stars.material as THREE.PointsMaterial).opacity = isDaytime ? 0 : 0.8;
    
    // Ajustar cor do céu
    if (isDaytime) {
      // Durante o dia
      const skyBlue = new THREE.Color(0x87CEEB);
      const deepBlue = new THREE.Color(0x1E90FF);
      const sunriseColor = new THREE.Color(0xFF7F50);
      
      if (Math.abs(hourOfDay - this.SUNRISE_TIME) < 1) {
        // Nascer do sol
        const t = 1 - Math.abs(hourOfDay - this.SUNRISE_TIME); // 0-1
        this.scene.background = sunriseColor.clone().lerp(skyBlue, t);
      } else if (Math.abs(hourOfDay - this.SUNSET_TIME) < 1) {
        // Pôr do sol
        const t = 1 - Math.abs(hourOfDay - this.SUNSET_TIME); // 0-1
        this.scene.background = sunriseColor.clone().lerp(skyBlue, t);
      } else {
        // Meio do dia
        const noonProgress = Math.sin((hourOfDay - this.SUNRISE_TIME) / (this.SUNSET_TIME - this.SUNRISE_TIME) * Math.PI);
        this.scene.background = skyBlue.clone().lerp(deepBlue, noonProgress);
      }
    } else {
      // Noite
      this.scene.background = new THREE.Color(0x000033);
    }
    
    // Atualizar a neblina para dar sensação de profundidade
    if (isDaytime) {
      this.scene.fog = new THREE.Fog(
        this.scene.background as THREE.Color, 
        50,  // near
        200  // far
      );
    } else {
      this.scene.fog = new THREE.Fog(
        new THREE.Color(0x000022), 
        30,  // near
        100  // far
      );
    }

    // Notificar listeners
    for (const callback of this.timeChangeListeners) {
      callback();
    }
  }

  // Método para sincronizar com o horário de Brasília
  private syncWithBrasiliaTime(): void {
    // Obter data e hora atual
    const now = new Date();
    
    // Converter para fuso horário de Brasília (UTC-3)
    const brasiliaHours = now.getUTCHours() - 3;
    const adjustedHours = brasiliaHours < 0 ? brasiliaHours + 24 : brasiliaHours;
    const minutes = now.getUTCMinutes();
    
    // Converter para formato decimal (horas.minutos)
    const decimalTime = adjustedHours + (minutes / 60);
    
    // Converter para progresso do dia (0-1)
    this.dayProgress = decimalTime / 24;
    
    // Atualizar iluminação
    this.updateLighting();
    
    console.log(`Sincronizado com horário de Brasília: ${adjustedHours}:${minutes.toString().padStart(2, '0')} (progresso: ${this.dayProgress.toFixed(3)})`);
  }

  // Método para definir o multiplicador de intensidade de luz
  public setLightIntensityMultiplier(multiplier: number): void {
    this.lightIntensityMultiplier = Math.max(0.2, Math.min(1.0, multiplier));
    this.updateLighting(); // Atualizar iluminação com o novo multiplicador
  }
}