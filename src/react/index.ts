// @neowhale/storefront/react — React entry point

// Provider
export { WhaleProvider } from './provider.js'
export type { WhaleProviderProps } from './provider.js'

// Context
export { WhaleContext } from './context.js'
export type { WhaleContextValue } from './context.js'

// Hooks
export { useCart, useCartItemCount, useCartTotal } from './hooks/use-cart.js'
export { useAuth } from './hooks/use-auth.js'
export { useProducts, useProduct } from './hooks/use-products.js'
export { useAnalytics } from './hooks/use-analytics.js'
export { useWhaleClient } from './hooks/use-client.js'
export { useCustomerOrders, useCustomerAnalytics } from './hooks/use-customer.js'
export { useCheckout } from './hooks/use-checkout.js'
export { useSearch } from './hooks/use-search.js'
export type { SearchParams } from './hooks/use-search.js'
export { useCategories } from './hooks/use-categories.js'
export { useLoyalty } from './hooks/use-loyalty.js'
export { useReviews } from './hooks/use-reviews.js'
export { useWishlist } from './hooks/use-wishlist.js'
export { useRecommendations } from './hooks/use-recommendations.js'
export { useLocations } from './hooks/use-locations.js'
export { useShipping } from './hooks/use-shipping.js'
export { useDeals, useCoupons } from './hooks/use-coupons.js'
export { useReferral } from './hooks/use-referral.js'

// Components
export { QRLandingPage } from './components/qr-landing-page.js'
export type { QRLandingPageProps } from './components/qr-landing-page.js'
export { LandingPage } from './components/landing-page.js'
export type { LandingPageProps } from './components/landing-page.js'
export { SectionRenderer } from './components/section-renderer.js'
export type { SectionTheme, ClickTrackingContext } from './components/section-renderer.js'
export { AnalyticsTracker } from './components/analytics-tracker.js'
export { CartInitializer } from './components/cart-initializer.js'
export { AuthInitializer } from './components/auth-initializer.js'
export { PixelInitializer } from './components/pixel-initializer.js'
export { BehavioralTrackerComponent } from './components/behavioral-tracker.js'
export { FingerprintCollector } from './components/fingerprint-collector.js'
export { SessionRecorderComponent } from './components/session-recorder.js'

// Store types (for consumers who need to create custom selectors)
export type { CartState, CartActions, CartStore } from './stores/cart-store.js'
export type { AuthState, AuthActions, AuthStore } from './stores/auth-store.js'
