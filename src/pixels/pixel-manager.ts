import type { PixelConfig, PixelProvider } from './types.js'
import { MetaPixelProvider } from './meta-pixel.js'

const PROVIDER_REGISTRY: Record<string, new (pixelId: string) => PixelProvider> = {
  meta: MetaPixelProvider,
}

export class PixelManager {
  private providers: PixelProvider[] = []

  constructor(configs: PixelConfig[]) {
    for (const config of configs) {
      const Ctor = PROVIDER_REGISTRY[config.provider]
      if (Ctor) {
        this.providers.push(new Ctor(config.pixel_id))
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
