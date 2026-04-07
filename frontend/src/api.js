import axios from 'axios';

const api = axios.create({
    baseURL: `http://${window.location.hostname}:8001/api`, // Dynamically use the host IP, changed to 8001 to avoid conflicts
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

export default api;
