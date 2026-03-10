export interface PixelProvider {
  name: string
  load(): Promise<void>
  track(event: string, params?: Record<string, unknown>): void
  isLoaded(): boolean
}

export interface PixelConfig {
  provider: string
  pixel_id: string
}

export interface StorefrontConfig {
  object: 'storefront_config'
  pixels: PixelConfig[]
  theme?: Record<string, unknown>
}
