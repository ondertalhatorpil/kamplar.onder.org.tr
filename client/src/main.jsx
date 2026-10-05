import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#fff' }
          },
          error: {
            iconTheme: { primary: '#d02a2b', secondary: '#fff' }
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)

const initialLoader = document.getElementById('initial-loader')
if (initialLoader) {
  setTimeout(() => {
    initialLoader.classList.add('loader-hidden')
    initialLoader.addEventListener('transitionend', () => initialLoader.remove())
  }, 1200)
}
