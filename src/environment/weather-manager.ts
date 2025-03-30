import * as THREE from 'three';
import { LightingManager } from './lighting-manager';

// Enumeração de tipos de clima
export enum WeatherType {
  CLEAR, 
  CLOUDY,
  LIGHT_RAIN,
  HEAVY_RAIN,
  FOG
}

// Classe para gerenciar efeitos climáticos
export class WeatherManager {
  private scene: THREE.Scene;
  private lightingManager: LightingManager;
  private currentWeather: WeatherType = WeatherType.CLEAR;
  
  // Original background color
  private originalSkyColor: THREE.Color;
  
  // Sistemas de partículas e nuvens
  private rainParticles: THREE.Points | null = null;
  private heavyRainParticles: THREE.Points | null = null;
  private clouds: THREE.Object3D[] = [];
  
  // Configurações
  private updateInterval: number = 15 * 60 * 1000;
  private lastUpdateTime: number = 0;
  
  // Coordenadas de Porto Alegre
  private latitude: number = -30.0346;
  private longitude: number = -51.2177;

  constructor(scene: THREE.Scene, lightingManager: LightingManager) {
    this.scene = scene;
    this.lightingManager = lightingManager;
    
    // Guardar a cor original do céu
    this.originalSkyColor = scene.background 
      ? (scene.background as THREE.Color).clone() 
      : new THREE.Color(0x87CEEB);
    
    // Inicializar sistemas
    this.initRainSystem();
    this.initClouds();
    
    // Buscar dados climáticos ao inicializar
    this.fetchWeatherData();
    this.lastUpdateTime = Date.now();
  }

  // Inicializar sistema de nuvens 3D
  private initClouds(): void {
    // Criar 40 nuvens cartoon (mais nuvens para melhor cobertura)
    for (let i = 0; i < 40; i++) {
      const cloud = this.createCloudModel();
      
      // Distribuir nuvens em diferentes alturas e áreas
      cloud.position.set(
        Math.random() * 1200 - 600,  // x: -600 a 600 (área maior)
        30 + Math.random() * 40,     // y: 30 a 70 (variação de altura)
        Math.random() * 1200 - 600   // z: -600 a 600 (área maior)
      );
      
      // Rotação e escala aleatórias
      cloud.rotation.y = Math.random() * Math.PI * 2;
      
      // Tamanhos mais variados (algumas maiores, algumas menores)
      const scale = 0.8 + Math.random() * 3.5;
      cloud.scale.set(scale, scale * 0.6, scale);
      
      // Tornar invisível inicialmente
      cloud.visible = false;
      
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
    
    console.log(`Sistema de nuvens inicializado: ${this.clouds.length} nuvens criadas`);
  }
  
  // Criar um modelo de nuvem estilo cartoon com melhor visibilidade
  private createCloudModel(): THREE.Object3D {
    const cloudGroup = new THREE.Group();
    
    // Usar MeshBasicMaterial para não depender de iluminação
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,  // Mais opaco para melhor visibilidade
      depthWrite: false
    });
    
    // Criar geometrias simples para as partes da nuvem
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(6, 8, 8),  // Esfera central maior
      cloudMaterial
    );
    cloudGroup.add(centerSphere);
    
    // Adicionar mais esferas para nuvens mais volumosas
    const numBalls = 6 + Math.floor(Math.random() * 4); // 6-9 esferas
    for (let i = 0; i < numBalls; i++) {
      const ballSize = 4 + Math.random() * 4.5;  // Esferas maiores
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(ballSize, 8, 8),
        cloudMaterial
      );
      
      // Posicionar as esferas ao redor da esfera central
      const angle = (i / numBalls) * Math.PI * 2;
      const distance = 5 + Math.random() * 3;
      ball.position.x = Math.cos(angle) * distance;
      ball.position.z = Math.sin(angle) * distance;
      ball.position.y = Math.random() * 3 - 1.5; // Maior variação de altura
      
      cloudGroup.add(ball);
    }
    
    return cloudGroup;
  }

  // Inicializar sistema de chuva
  private initRainSystem(): void {
    // Sistema para chuva leve
    const rainGeometry = new THREE.BufferGeometry();
    const rainVertices = [];
    
    // Criar 2000 partículas para chuva leve
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 1000 - 500;
      const y = Math.random() * 200;
      const z = Math.random() * 1000 - 500;
      rainVertices.push(x, y, z);
    }
    
    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xCCCCFF,
      size: 0.8,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    
    this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    this.scene.add(this.rainParticles);
    
    // Sistema para chuva forte
    const heavyRainGeometry = new THREE.BufferGeometry();
    const heavyRainVertices = [];
    
    // Criar 5000 partículas para chuva forte
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 1000 - 500;
      const y = Math.random() * 200;
      const z = Math.random() * 1000 - 500;
      heavyRainVertices.push(x, y, z);
    }
    
    heavyRainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(heavyRainVertices, 3));
    
    const heavyRainMaterial = new THREE.PointsMaterial({
      color: 0xAABBFF,
      size: 1.2,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    
    this.heavyRainParticles = new THREE.Points(heavyRainGeometry, heavyRainMaterial);
    this.scene.add(this.heavyRainParticles);
  }

  // Obter o clima atual
  public getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  // Definir o clima e aplicar efeitos
  public setWeather(weatherType: WeatherType): void {
    this.currentWeather = weatherType;
    console.log(`Clima alterado para: ${WeatherType[weatherType]}`);
    
    // Limpar efeitos anteriores
    this.clearWeatherEffects();
    
    // Aplicar novos efeitos
    switch (weatherType) {
      case WeatherType.CLEAR:
        this.scene.background = this.originalSkyColor.clone();
        this.lightingManager.setLightIntensityMultiplier(1.0);
        // Desativar chuva, nuvens e neblina
        this.setRainVisibility(false, false);
        this.setCloudVisibility(false);
        this.scene.fog = null;
        break;
        
      case WeatherType.CLOUDY:
        this.scene.background = new THREE.Color(0x9999BB); // Cor azul-acinzentada
        // Neblina muito leve
        this.scene.fog = new THREE.Fog(0x9999BB, 300, 1500);
        this.lightingManager.setLightIntensityMultiplier(0.85);
        // Mostrar nuvens
        this.setCloudVisibility(true);
        break;
        
      case WeatherType.LIGHT_RAIN:
        this.scene.background = new THREE.Color(0x7777AA); // Mais escuro que nublado
        this.scene.fog = new THREE.Fog(0x7777AA, 150, 800);
        this.lightingManager.setLightIntensityMultiplier(0.7);
        // Ativar chuva leve e nuvens
        this.setRainVisibility(true, false);
        this.setCloudVisibility(true);
        break;
        
      case WeatherType.HEAVY_RAIN:
        this.scene.background = new THREE.Color(0x444466); // Bem escuro
        this.scene.fog = new THREE.Fog(0x444466, 80, 400);
        this.lightingManager.setLightIntensityMultiplier(0.4);
        // Ativar chuva forte e nuvens
        this.setRainVisibility(false, true);
        this.setCloudVisibility(true);
        break;
        
      case WeatherType.FOG:
        this.scene.background = new THREE.Color(0xCCCCCC); // Branco-acinzentado
        // Neblina extremamente densa
        this.scene.fog = new THREE.FogExp2(0xCCCCCC, 0.03); // Densidade maior
        this.lightingManager.setLightIntensityMultiplier(0.55);
        break;
    }
  }

  // Definir visibilidade das nuvens com base no clima
  private setCloudVisibility(visible: boolean): void {
    // Se não deve mostrar nuvens, esconde todas
    if (!visible) {
      this.clouds.forEach(cloud => {
        cloud.visible = false;
      });
      return;
    }
    
    // Determinar quantas nuvens mostrar com base no tipo de clima
    let visibleCloudCount = 0;
    
    switch (this.currentWeather) {
      case WeatherType.CLOUDY:
        visibleCloudCount = Math.floor(this.clouds.length * 0.6); // 60% das nuvens
        break;
      case WeatherType.LIGHT_RAIN:
        visibleCloudCount = Math.floor(this.clouds.length * 0.8); // 80% das nuvens
        break;
      case WeatherType.HEAVY_RAIN:
        visibleCloudCount = this.clouds.length; // 100% das nuvens
        break;
      default:
        visibleCloudCount = 0;
    }
    
    // Mostrar o número apropriado de nuvens
    this.clouds.forEach((cloud, index) => {
      cloud.visible = index < visibleCloudCount;
    });
    
    console.log(`Nuvens visíveis: ${visibleCloudCount} de ${this.clouds.length}`);
  }

  // Definir visibilidade da chuva
  private setRainVisibility(lightRain: boolean, heavyRain: boolean): void {
    if (this.rainParticles) {
      (this.rainParticles.material as THREE.PointsMaterial).opacity = lightRain ? 0.6 : 0;
    }
    if (this.heavyRainParticles) {
      (this.heavyRainParticles.material as THREE.PointsMaterial).opacity = heavyRain ? 0.8 : 0;
    }
  }

  // Limpar todos os efeitos climáticos
  private clearWeatherEffects(): void {
    // Remover neblina
    this.scene.fog = null;
    
    // Desativar partículas de chuva
    this.setRainVisibility(false, false);
    
    // Esconder nuvens
    this.setCloudVisibility(false);
  }

  // Buscar dados climáticos da API Open-Meteo
  public async fetchWeatherData(): Promise<void> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=temperature_2m,weathercode,precipitation,visibility,windspeed_10m`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.current) {
        console.log("Dados climáticos recebidos:", data.current);
        
        const weathercode = data.current.weathercode;
        const precipitation = data.current.precipitation || 0;
        const visibility = data.current.visibility || 10000;
        const windspeed = data.current.windspeed_10m || 0;
        
        // Interpretar o código WMO para determinar o clima
        if (weathercode === 0) {
          // Céu limpo
          this.setWeather(WeatherType.CLEAR);
        } 
        else if (weathercode >= 1 && weathercode <= 3) {
          // Parcialmente nublado
          this.setWeather(WeatherType.CLOUDY);
        }
        else if (weathercode >= 45 && weathercode <= 49) {
          // Neblina ou nevoeiro
          this.setWeather(WeatherType.FOG);
        }
        else if ((weathercode >= 51 && weathercode <= 67) || 
                 (weathercode >= 80 && weathercode <= 82)) {
          // Chuva (verificar intensidade)
          if (precipitation > 3.0 || 
              (weathercode >= 63 && weathercode <= 67) || 
              (weathercode >= 81 && weathercode <= 82)) {
            this.setWeather(WeatherType.HEAVY_RAIN);
          } else {
            this.setWeather(WeatherType.LIGHT_RAIN);
          }
        }
        else if (weathercode >= 95 && weathercode <= 99) {
          // Tempestade com trovoadas
          this.setWeather(WeatherType.HEAVY_RAIN);
        }
        else {
          // Outros códigos - usar visibilidade e vento para decidir
          if (visibility < 1000) {
            this.setWeather(WeatherType.FOG);
          } else if (windspeed > 10) {
            this.setWeather(WeatherType.CLOUDY);
          } else {
            this.setWeather(WeatherType.CLEAR);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados climáticos:", error);
    }
  }

  // Atualização chamada a cada frame
  public update(deltaTime: number): void {
    // Verificar se é hora de atualizar os dados climáticos
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime > this.updateInterval) {
      this.fetchWeatherData();
      this.lastUpdateTime = currentTime;
    }
    
    // Atualizar partículas de chuva se estiverem ativas
    this.updateRainParticles(deltaTime);
    
    // Mover nuvens lentamente
    this.updateClouds(deltaTime);
  }
  
  // Atualizar posição das nuvens
  private updateClouds(deltaTime: number): void {
    if (this.currentWeather === WeatherType.CLOUDY || 
        this.currentWeather === WeatherType.LIGHT_RAIN || 
        this.currentWeather === WeatherType.HEAVY_RAIN) {
      
      this.clouds.forEach(cloud => {
        // Mover a nuvem lentamente
        cloud.position.x += 5 * deltaTime;
        
        // Se a nuvem saiu do campo visível, reposicionar
        if (cloud.position.x > 500) {
          cloud.position.x = -500;
          cloud.position.z = Math.random() * 800 - 400;
          cloud.position.y = 30 + Math.random() * 20;
        }
      });
    }
  }
  
  // Atualizar as partículas de chuva
  private updateRainParticles(deltaTime: number): void {
    // Verificar se a chuva está ativa
    const isLightRain = this.currentWeather === WeatherType.LIGHT_RAIN;
    const isHeavyRain = this.currentWeather === WeatherType.HEAVY_RAIN;
    
    if (!isLightRain && !isHeavyRain) return;
    
    // Determinar qual sistema de partículas atualizar
    const particleSystem = isLightRain ? this.rainParticles : this.heavyRainParticles;
    
    if (particleSystem) {
      const positions = (particleSystem.geometry as THREE.BufferGeometry)
                        .getAttribute('position') as THREE.BufferAttribute;
      
      // Velocidade da chuva - chuva forte cai mais rápido
      const rainSpeed = isLightRain ? 50 : 100;
      
      for (let i = 0; i < positions.count; i++) {
        // Mover a partícula para baixo
        const y = positions.getY(i) - rainSpeed * deltaTime;
        
        // Se a partícula chegou ao solo, reposicionar no topo
        if (y < 0) {
          positions.setY(i, 200);
          positions.setX(i, Math.random() * 1000 - 500);
          positions.setZ(i, Math.random() * 1000 - 500);
        } else {
          positions.setY(i, y);
        }
      }
      
      positions.needsUpdate = true;
    }
  }
}