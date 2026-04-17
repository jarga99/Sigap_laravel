import axios from 'axios'
import { API_BASE_URL } from '../lib/config'

// 1. Buat instance Axios
const api = axios.create({
  // Sesuaikan dengan URL Backend Next.js Anda
  baseURL: `${API_BASE_URL}/api`, 
  headers: {
    'Content-Type': 'application/json'
  }
})

// 2. Interceptor Request (Otomatis tempel Token)
// Setiap kali frontend request ke backend, kode ini jalan duluan
api.interceptors.request.use(
  (config) => {
    // Ambil token dari LocalStorage
    const token = localStorage.getItem('token')
    
    // Jika token ada, tempelkan di Header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 3. Interceptor Response (Otomatis handle error token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jika backend bilang 401 (Unauthorized), berarti token basi/salah
    if (error.response && error.response.status === 401) {
      // Hapus token & paksa logout (opsional: redirect ke login)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // window.location.href = '/auth/login' // Aktifkan jika ingin auto-redirect
    }
    return Promise.reject(error)
  }
)

export default api