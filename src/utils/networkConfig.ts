// Configuración de red y manejo de conectividad
export interface NetworkConfig {
  firebaseTimeout: number;
  serverTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  pingInterval: number;
}

export const defaultNetworkConfig: NetworkConfig = {
  firebaseTimeout: 8000,     // 8 segundos para Firebase
  serverTimeout: 3000,       // 3 segundos para el servidor
  retryAttempts: 3,          // 3 intentos de reconexión
  retryDelay: 2000,          // 2 segundos entre intentos
  pingInterval: 30000,       // Verificar conectividad cada 30 segundos
};

// Utilidad para crear promises con timeout
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
  );
  
  return Promise.race([promise, timeoutPromise]);
}

// Utilidad para verificar conectividad del servidor
export async function checkServerConnectivity(baseURL: string = ''): Promise<boolean> {
  try {
    const response = await withTimeout(
      fetch(`${baseURL}/api/ping`, { 
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      }),
      defaultNetworkConfig.serverTimeout
    );
    
    return response.ok;
  } catch (error) {
    console.warn('🔍 Verificación de conectividad falló:', error);
    return false;
  }
}

// Utilidad para verificar conectividad de Firebase
export async function checkFirebaseConnectivity(): Promise<boolean> {
  try {
    // Aquí podrías hacer una query simple a Firebase para verificar conectividad
    // Por ahora, usamos una aproximación básica
    return navigator.onLine;
  } catch (error) {
    console.warn('🔍 Verificación de Firebase falló:', error);
    return false;
  }
}

// Detector de estado de red más robusto
export class NetworkDetector {
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];
  private isOnline: boolean = navigator.onLine;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private config: NetworkConfig = defaultNetworkConfig) {
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    console.log('🌐 Navegador detectó conexión online');
    this.verifyActualConnectivity();
  }

  private handleOffline(): void {
    console.log('📱 Navegador detectó pérdida de conexión');
    this.setOffline();
  }

  private async verifyActualConnectivity(): Promise<void> {
    const hasServerConnection = await checkServerConnectivity();
    
    if (hasServerConnection && !this.isOnline) {
      this.setOnline();
    } else if (!hasServerConnection && this.isOnline) {
      this.setOffline();
    }
  }

  private setOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true;
      console.log('✅ Estado: ONLINE');
      this.onlineCallbacks.forEach(callback => callback());
    }
  }

  private setOffline(): void {
    if (this.isOnline) {
      this.isOnline = false;
      console.log('❌ Estado: OFFLINE');
      this.offlineCallbacks.forEach(callback => callback());
    }
  }

  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(() => {
      this.verifyActualConnectivity();
    }, this.config.pingInterval);
  }

  public onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  public onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Utilidad para reintentos con backoff exponencial
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = defaultNetworkConfig.retryAttempts,
  baseDelay: number = defaultNetworkConfig.retryDelay
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`🔄 Intento ${attempt}/${maxAttempts} falló, reintentando en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}