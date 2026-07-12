import { runDemo } from './demo';
import './style/demo.css';

document.addEventListener('DOMContentLoaded', async () => {
  let useLocalCorsProxy = false;

  // If running on localhost, check if there is also a local CORS proxy running on port 8881.
  if (location.hostname === 'localhost') {
    try {
      const corsProxy = 'http://localhost:8881/';
      const response = await fetch(corsProxy);
      useLocalCorsProxy = response.ok && response.type === 'cors';
    } catch (error) {
      // Ignore failed fetch.
    }
  }

  await runDemo(useLocalCorsProxy);
});
