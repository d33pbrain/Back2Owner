// config.js (Auto-detects environment)
const IS_LOCAL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

const CONFIG = {
    API_BASE_URL: IS_LOCAL 
        ? 'http://127.0.0.1:8000' 
        : 'https://back2owner-dpey.onrender.com'
};