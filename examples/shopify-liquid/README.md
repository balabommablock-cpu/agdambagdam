# shopify-liquid — A/B test your Shopify store

A single Liquid snippet you include from `theme.liquid`. Sets a `data-ab-variant` attribute on `<html>` so every page + template can respond with CSS or JS.

## Install

1. Shopify admin → **Online Store → Themes → (your theme) → Actions → Edit code**.
2. Under **Snippets**, click **Add a new snippet**. Name it `agdambagdam` (no extension).
3. Paste the contents of `agdambagdam.liquid` into the new snippet.
4. Open `layout/theme.liquid`. Inside the `<head>`, add:

   ```liquid
   {%- render 'agdambagdam' -%}
   ```

5. **Save**. The SDK now loads on every storefront page.

## How it works

- Loads the Agdam Bagdam SDK from unpkg with `async` (doesn't block your page-speed score).
- Uses Shopify's `{{ customer.id }}` as the sticky user ID when a customer is logged in, or falls back to the SDK's anonymous ID (stored in the customer's browser) for guest visitors.
- Assigns a variant for the experiment key you configure at the top of the snippet.
- Writes the variant name to `document.documentElement.dataset.abVariant`, which you can target with CSS:

  ```css
  /* In your theme's CSS, or via the customizer */
  [data-ab-variant="treatment"] .product-form__submit {
    background-color: #16a34a !important;
  }
  ```

- Exposes `window.__abacusReady` — a promise that resolves to the variant name. Any theme JS can `await window.__abacusReady` before changing the UI.

- Tracks "Add to cart" clicks (on `.add-to-cart`, `.product-form__submit`, and `button[name="add"]`) as conversions on the experiment.

## Customising

Edit the three Liquid variables at the top of the snippet:

```liquid
{%- liquid
  assign ab_api_key = 'YOUR-PUBLIC-KEY'
  assign ab_base_url = 'https://boredfolio.com/agdambagdam/api'
  assign ab_experiment_key = 'homepage-hero-test'
-%}
```

For multiple experiments, duplicate the snippet (e.g. `agdambagdam-hero.liquid`, `agdambagdam-cart.liquid`) and render each one where you need it.

## What to test first (ideas)

| Experiment | Variant change |
|---|---|
| Add-to-cart button color | `[data-ab-variant="green"] .add-to-cart { background: #16a34a }` |
| Free-shipping banner copy | Two `<div>`s with `[data-ab-variant="A"]{...}` / `[data-ab-variant="B"]{...}` |
| Product card layout | Grid vs list, toggled by CSS |
| Upsell placement | Conditionally show/hide a block via `[data-ab-variant]` selectors |

## Troubleshooting

- **The `data-ab-variant` attribute is always `control`:** Open your browser's DevTools console. The SDK logs the exact error with a docs link. Most common: experiment not running in the dashboard, or API key doesn't match your project.
- **Add-to-cart clicks don't register:** Your theme might use a different class or submit pattern. Open DevTools → Elements, find your add-to-cart button, and add its selector to the click handler in the snippet.
- **Page-speed score dropped:** Make sure the script tag still has `async`. If you remove it, the SDK blocks first paint.
- **Checkout extensions:** Shopify Checkout runs in an isolated context — this snippet does NOT affect checkout pages. Use Shopify's [Checkout UI Extensions](https://shopify.dev/docs/apps/checkout) for those.

## Data privacy

- The SDK respects DNT (Do Not Track) by default.
- No third-party cookies.
- Guest user IDs are stored only in the visitor's own browser `localStorage` — never sent to third parties.
- When `customer.id` is available, it's hashed internally before being used for bucket assignment, so Shopify customer IDs are not exposed to Agdam Bagdam's logs.
