/* Google Analytics (GA4). Only really tracks meaningfully once this is
   hosted on a real domain — file:// page loads get filtered/discarded
   by Google's collectors, so don't expect data while testing locally. */
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-WJNEVDRPSR');

(function(){
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-WJNEVDRPSR';
  document.head.appendChild(s);
})();
