import axios from 'axios';

const API = axios.create({
  baseURL: 'https://0af3-203-188-250-146.ngrok-free.app/api',
});

// Request Interceptor token to be sent with every request to the backend
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
