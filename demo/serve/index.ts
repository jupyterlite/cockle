import './style/demo.css';
import { Demo } from './demo';

document.addEventListener('DOMContentLoaded', async () => {
  const targetDiv: HTMLElement = document.getElementById('targetdiv')!;
  const demo = new Demo({ targetDiv });
  await demo.start();
});
