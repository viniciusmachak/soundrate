import { environment } from './environments/environment';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

// Loads the Umami tracker, which Caddy serves from the same origin in production.
// It records page views, including Angular route changes, without cookies.
export function loadAnalytics(): void {
  const { umamiWebsiteId } = environment;
  if (!umamiWebsiteId || LOCAL_HOSTS.includes(location.hostname)) {
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = '/stats.js';
  script.dataset['websiteId'] = umamiWebsiteId;
  document.head.appendChild(script);
}
