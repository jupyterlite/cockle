import { ShellManager } from '@jupyterlite/cockle';
import './style/demo.css';
import { Demo } from './demo';

document.addEventListener('DOMContentLoaded', async () => {
  const baseUrl = window.location.href;
  const shellManager = new ShellManager();
  const browsingContextId = await shellManager.installServiceWorker(baseUrl);

  const targetDiv: HTMLElement = document.getElementById('targetdiv')!;
  const demo = new Demo({ baseUrl, browsingContextId, shellManager, targetDiv });

  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
  themeSelect?.addEventListener('change', (event: any) => {
    const [foreground, background, mode] = themeSelect.value.split('-');
    demo.setTheme(foreground, background, mode);
  });

  await demo.start();
});
