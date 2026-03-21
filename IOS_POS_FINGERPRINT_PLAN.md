# iOS POS → Web Customer Fingerprint Linking

## The Vision
When a customer shops in-store at the POS, link their device fingerprint (from their phone
on the store WiFi or from a QR scan) to their customer profile. Then when they visit the
website later, the device fingerprint automatically connects their online session to their
in-store purchase history.

## How It Works

### Step 1: In-Store Customer Capture
When a customer checks out at the POS:
1. POS creates/finds the customer record (email/phone from receipt)
2. POS generates a **customer QR code** — a short-lived token URL like:
   `https://whale-gateway.fly.dev/link/{token}`
3. Customer scans QR with their phone → opens the store's website with a `?link_token={token}` param

### Step 2: Browser Fingerprint + Token Exchange
When the customer's phone opens the link:
1. The SDK's FingerprintCollector runs automatically (canvas, WebGL, audio hash)
2. The SDK detects `link_token` in the URL params
3. SDK sends the fingerprint_id + link_token to:
   `POST /v1/stores/{storeId}/storefront/fingerprint-link`
4. Gateway resolves the token → gets customer_id → links fingerprint to customer

### Step 3: Future Visits Auto-Link
On any future website visit:
1. FingerprintCollector sends the stored fingerprint_id
2. Gateway checks `device_fingerprints` → finds linked customer_id
3. Session is automatically enriched with customer context
4. All behavioral data, purchases, and browsing history are unified

## Gateway Changes Needed

### New endpoint: `POST /v1/stores/:storeId/storefront/fingerprint-link`
```
Body: { link_token: string, fingerprint_id: string }
Response: { linked: true, customer_id: string }
```

### New table: `fingerprint_link_tokens`
```sql
CREATE TABLE fingerprint_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  token text UNIQUE NOT NULL,
  fingerprint_id text, -- filled when redeemed
  redeemed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### New table (or add to existing): `fingerprint_customer_links`
Already exists! Schema:
- fingerprint_id, customer_id, store_id, linked_at, link_source

## iOS POS Changes

### QR Generation at Checkout
After order completion in POS:
1. Call `POST /v1/stores/{storeId}/storefront/fingerprint-link-token`
   with `{ customer_id }` → returns `{ token, url }`
2. Display QR code on the POS screen or print on receipt
3. Text: "Scan to connect your rewards" or "Scan for digital receipt"

### Using Existing QR Infrastructure
The POS already has QR generation (`QRTrackingService.swift`):
- Product QR: `P{productId}`, Sale QR: `S{uuid}`, Order QR: `O{orderId}`
- Add new type: **Link QR**: `L{token}`
- Resolution via `GET /q/L{token}` → redirects to store URL with link_token param

## SDK Changes

### FingerprintCollector Enhancement
Detect `link_token` in URL params after fingerprint collection:
```typescript
const linkToken = new URLSearchParams(window.location.search).get('link_token')
if (linkToken && fp.fingerprint_id) {
  await fetch(`${baseUrl}/v1/stores/${storeId}/storefront/fingerprint-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ link_token: linkToken, fingerprint_id: fp.fingerprint_id }),
  })
}
```

## Data Flow

```
[POS Checkout] → creates link token → QR on receipt/screen
         ↓
[Customer Phone] → scans QR → opens store website
         ↓
[SDK] → collects fingerprint → sends fingerprint + token to gateway
         ↓
[Gateway] → resolves token → links fingerprint ↔ customer
         ↓
[Future Visits] → fingerprint auto-identifies customer
         ↓
[Analytics] → unified view: in-store + online behavior + purchases
```

## Palantir-Level Cross-Channel Intelligence

Once fingerprints are linked to customers, the analytics views can show:
- **Cross-channel attribution**: "This customer visited the website 3 times before buying in-store"
- **Retargeting**: "Customer browsed product X online, bought Y in-store — show cross-sell ad"
- **LTV unification**: Combine online + in-store spend into true customer lifetime value
- **Behavioral segmentation**: In-store-only vs online-only vs omnichannel shoppers
- **Location intelligence**: Which store locations drive the most online follow-up visits
