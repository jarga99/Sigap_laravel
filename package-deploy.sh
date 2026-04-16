#!/bin/bash

# SIGAP PLATFORM - DEPLOYMENT PACKAGER
# Gunakan script ini untuk menyiapkan file yang akan diunggah ke Jagoan Hosting.

echo "🚀 Memulai persiapan paket deployment..."

# 1. Pastikan folder dist bersih
rm -rf deploy_package
mkdir -p deploy_package

# 2. Build Backend (Standalone Mode)
echo "📦 Building Backend (Next.js Standalone)..."
cd backend-api
npm run build
if [ $? -ne 0 ]; then echo "❌ Build Backend Gagal!"; exit 1; fi

# Siapkan folder backend untuk ZIP
mkdir -p ../deploy_package/backend

# Ambil file core dan node_modules dari standalone build (PENTING untuk bypass limit server)
cp -r .next/standalone/. ../deploy_package/backend/
cp -r .next/static ../deploy_package/backend/.next/
cp -r public ../deploy_package/backend/
cp -r prisma ../deploy_package/backend/

# Sertakan package.json asli untuk referensi
cp package.json ../deploy_package/backend/
cd ..

# 3. Build Frontend (Vue)
echo "📦 Building Frontend (Vue/Vite)..."
cd frontend-client
# GANTI URL API di bawah ini sesuai subdomain API Anda di cPanel
# Contoh: VITE_API_URL=https://api-sigap.domainanda.com/api npm run build
VITE_API_URL=https://apiv1-sigap.uptblkpasuruan.com/api npm run build
if [ $? -ne 0 ]; then echo "❌ Build Frontend Gagal!"; exit 1; fi

# Siapkan folder frontend untuk ZIP
mkdir -p ../deploy_package/frontend
cp -r dist/* ../deploy_package/frontend/

# Tambahkan .htaccess untuk Vue Router (mencegah 404 saat refresh)
echo "📝 Menambahkan .htaccess untuk Frontend..."
cat > ../deploy_package/frontend/.htaccess <<EOF
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
EOF

cd ..

# 4. Tambahkan Helper Files
echo "📝 Menyertakan .env.example sebagai referensi..."
cp backend-api/.env.example deploy_package/backend/.env.example
cp frontend-client/.env.example deploy_package/frontend/.env.example

# 5. ZIP File
echo "🗜️ Mengompres file..."
cd deploy_package
zip -r backend_sigap.zip backend > /dev/null
zip -r frontend_sigap.zip frontend > /dev/null
cd ..

echo "=========================================================="
echo "✅ Paket deployment siap di folder: deploy_package/"
echo "----------------------------------------------------------"
echo "1. backend_sigap.zip -> Unggah ke folder BACKEND (di luar public_html)"
echo "2. frontend_sigap.zip -> Unggah ke folder SUBDOMAIN Frontend"
echo "----------------------------------------------------------"
echo "💡 Lihat dokumen 'deployment_guide.md' untuk panduan detail."
echo "=========================================================="
