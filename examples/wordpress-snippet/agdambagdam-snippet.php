<?php
/**
 * Agdam Bagdam — WordPress embed snippet.
 *
 * Drop this file into your theme or a code-snippet plugin (e.g. "Code Snippets"
 * or "Insert Headers and Footers"). It inserts the Agdam Bagdam SDK into every
 * page's <head>, plus a small example experiment that recolours the first
 * .cta-button on the page.
 *
 * Customise by editing the EXPERIMENT_KEY and the variant logic inside the
 * inline <script>. Remove the example block once you have your own experiments.
 */

if (!defined('ABSPATH')) {
    exit; // No direct access
}

add_action('wp_head', function () {
    $api_key   = 'demo-public-key';
    $base_url  = 'https://boredfolio.com/agdambagdam/api';
    $exp_key   = 'wp-cta-button-test';
    ?>
    <script src="https://unpkg.com/agdambagdam@latest/dist/abacus.js" async></script>
    <script>
      (function () {
        function ready(fn) {
          if (document.readyState !== 'loading') fn();
          else document.addEventListener('DOMContentLoaded', fn);
        }
        function waitForSDK(cb, tries) {
          tries = tries || 0;
          if (typeof window.Abacus !== 'undefined') cb();
          else if (tries < 50) setTimeout(function () { waitForSDK(cb, tries + 1); }, 100);
        }

        waitForSDK(function () {
          var ab = new window.Abacus({
            apiKey: <?php echo json_encode($api_key); ?>,
            baseUrl: <?php echo json_encode($base_url); ?>
          });

          ready(function () {
            ab.getVariant(<?php echo json_encode($exp_key); ?>).then(function (variant) {
              var btn = document.querySelector('.cta-button');
              if (!btn) return;
              if (variant === 'treatment' || variant === 'green') {
                btn.style.backgroundColor = '#16a34a';
              }
            }).catch(function () { /* SDK logs helpful error; fall through */ });

            // Track clicks on the CTA button
            document.body.addEventListener('click', function (e) {
              if (e.target && e.target.classList && e.target.classList.contains('cta-button')) {
                ab.track(<?php echo json_encode($exp_key . '-click'); ?>);
              }
            });
          });
        });
      })();
    </script>
    <?php
});
