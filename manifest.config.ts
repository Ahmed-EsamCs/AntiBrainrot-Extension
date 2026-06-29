import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AntiBrainrot - Stay Locked In',
  version: '1.0.0',
  description: 'Stay Locked In. A premium focus extension.',
  permissions: ['storage', 'alarms', 'tabs', 'notifications', 'webNavigation'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'AntiBrainrot',
  },
  options_page: 'src/options/index.html', 
  web_accessible_resources: [
    {
      resources: ['src/blocked/index.html', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
});