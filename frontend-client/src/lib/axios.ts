import axios from 'axios'

const api = axios.create({
  // Ganti ke URL Backend Next.js Anda. 
  // Jika port backend bukan 3000, sesuaikan.
  baseURL: '/api' 
})

// Interceptor Request (Biarkan seperti kode Anda, ini sudah benar)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor Response (TAMBAHAN PENTING: Handle error token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jika error 401 (Unauthorized), hapus token agar user login ulang
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Redirect instan ke login tanpa alert yang menghalangi
      window.location.replace('/login');
    }
    return Promise.reject(error)
  }
)

export default api