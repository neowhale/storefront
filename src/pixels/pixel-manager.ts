import type { PixelConfig, PixelProvider } from './types.js'
import { MetaPixelProvider } from './meta-pixel.js'
import { GooglePixelProvider } from './google-pixel.js'

export class PixelManager {
  private providers: PixelProvider[] = []

  constructor(configs: PixelConfig[]) {
    for (const config of configs) {
      if (config.provider === 'meta' && config.pixel_id) {
        this.providers.push(new MetaPixelProvider(config.pixel_id))
      } else if (config.provider === 'google' && config.measurement_id) {
        this.providers.push(new GooglePixelProvider(config.measurement_id))
      }
    }
  }

  async initialize(): Promise<void> {
    await Promise.all(this.providers.map((p) => p.load()))
  }

  track(event: string, params?: Record<string, unknown>): void {
    for (const provider of this.providers) {
      if (provider.isLoaded()) {
        provider.track(event, params)
      }
    }
  }
}
