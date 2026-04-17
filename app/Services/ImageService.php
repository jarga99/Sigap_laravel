<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class ImageService
{
    /**
     * Final optimize and save image as WebP
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $folder Relative path from public/
     * @param string $prefix
     * @param int $maxWidth
     * @return string|null Relative URL path
     */
    public function optimize($file, $folder, $prefix = 'IMG', $maxWidth = 1200)
    {
        $extension = strtolower($file->getClientOriginalExtension());
        
        // Skip optimizing for SVG
        if ($extension === 'svg') {
            $userId = auth()->id() ?? 'guest';
            $filename = $prefix . '_' . date('Ymd_His') . '_upload_by_' . $userId . '.svg';
            $file->move(public_path($folder), $filename);
            return '/' . trim($folder, '/') . '/' . $filename;
        }

        // Load image resource
        $img = null;
        switch ($extension) {
            case 'jpeg':
            case 'jpg':
                $img = imagecreatefromjpeg($file->getRealPath());
                break;
            case 'png':
                $img = imagecreatefrompng($file->getRealPath());
                imagepalettetobruecolor($img);
                imagealphablending($img, true);
                imagesavealpha($img, true);
                break;
            case 'webp':
                $img = imagecreatefromwebp($file->getRealPath());
                break;
            default:
                return null;
        }

        if (!$img) return null;

        // --- 📏 SMART RESIZING ---
        $width = imagesx($img);
        $height = imagesy($img);
        
        if ($width > $maxWidth) {
            $newWidth = $maxWidth;
            $newHeight = floor($height * ($maxWidth / $width));
            
            $tmp = imagecreatetruecolor($newWidth, $newHeight);
            
            // Preserve transparency for WebP/PNG
            imagealphablending($tmp, false);
            imagesavealpha($tmp, true);
            
            imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($img);
            $img = $tmp;
        }

        // --- 🚀 COMPRESSION & TARGET SIZE (200KB) ---
        $userId = auth()->id() ?? 'guest';
        $filename = $prefix . '_' . date('Ymd_His') . '_upload_by_' . $userId . '.webp';
        $uploadPath = public_path($folder);
        if (!File::exists($uploadPath)) {
            File::makeDirectory($uploadPath, 0755, true);
        }
        $fullPath = $uploadPath . '/' . $filename;

        // Start with quality 70 and iteratively reduce if needed to hit 200KB limit
        $quality = 70;
        do {
            imagewebp($img, $fullPath, $quality);
            $size = filesize($fullPath);
            if ($size > 200 * 1024) {
                $quality -= 10;
                // If quality is already very low, we must downscale dimensions
                if ($quality < 20) {
                    $currW = imagesx($img);
                    $currH = imagesy($img);
                    $scale = 0.8;
                    $newW = floor($currW * $scale);
                    $newH = floor($currH * $scale);
                    
                    $tmp = imagecreatetruecolor($newW, $newH);
                    imagealphablending($tmp, false);
                    imagesavealpha($tmp, true);
                    imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newW, $newH, $currW, $currH);
                    imagedestroy($img);
                    $img = $tmp;
                    $quality = 60; // Reset quality for smaller dimensions
                }
            }
        } while ($size > 200 * 1024 && imagesx($img) > 100);

        imagedestroy($img);

        return '/' . trim($folder, '/') . '/' . $filename;
    }
}
