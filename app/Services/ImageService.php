<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class ImageService
{
    /**
     * Final optimize and save image as WebP (with JPEG fallback)
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $folder Relative path from public/
     * @param string $prefix
     * @param int $maxWidth
     * @return string|null Relative URL path
     */
    public function optimize($file, $folder, $prefix = 'IMG', $maxWidth = 1200)
    {
        $extension = \strtolower($file->getClientOriginalExtension());
        $userId = \auth()->id() ?? 'guest';
        $filename = $prefix . '_' . \date('Ymd_His') . '_upload_by_' . $userId;

        // --- 🛡️ EMERGENCY BYPASS (If GD is missing) ---
        if (!\extension_loaded('gd')) {
            $ext = ($extension === 'svg') ? 'svg' : $extension;
            $finalName = $filename . '.' . $ext;
            $file->move(\public_path($folder), $finalName);
            return '/' . \trim($folder, '/') . '/' . $finalName;
        }

        // --- 📂 SVG HANDLING ---
        if ($extension === 'svg') {
            $finalName = $filename . '.svg';
            $file->move(\public_path($folder), $finalName);
            return '/' . \trim($folder, '/') . '/' . $finalName;
        }

        try {
            // Load image resource
            $img = null;
            switch ($extension) {
                case 'jpeg':
                case 'jpg':
                    $img = @\imagecreatefromjpeg($file->getRealPath());
                    break;
                case 'png':
                    $img = @\imagecreatefrompng($file->getRealPath());
                    if ($img) {
                        \imagepalettetotruecolor($img);
                        \imagealphablending($img, true);
                        \imagesavealpha($img, true);
                    }
                    break;
                case 'webp':
                    $img = @\imagecreatefromwebp($file->getRealPath());
                    break;
                default:
                    // If unknown but we want to store it anyway
                    $finalName = $filename . '.' . $extension;
                    $file->move(\public_path($folder), $finalName);
                    return '/' . \trim($folder, '/') . '/' . $finalName;
            }

            if (!$img) {
                // Fail-safe: Save original if GD fails to read
                $finalName = $filename . '.' . $extension;
                $file->move(\public_path($folder), $finalName);
                return '/' . \trim($folder, '/') . '/' . $finalName;
            }

            // --- 📏 SMART RESIZING ---
            $width = \imagesx($img);
            $height = \imagesy($img);
            
            if ($width > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = \floor($height * ($maxWidth / $width));
                
                $tmp = \imagecreatetruecolor($newWidth, $newHeight);
                \imagealphablending($tmp, false);
                \imagesavealpha($tmp, true);
                \imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                \imagedestroy($img);
                $img = $tmp;
            }

            // --- 🚀 COMPRESSION & TARGET SIZE ---
            $uploadPath = \public_path($folder);
            if (!File::exists($uploadPath)) {
                File::makeDirectory($uploadPath, 0755, true);
            }

            // Determine Format Support (WebP preferred, JPEG fallback)
            $supportsWebP = \function_exists('imagewebp');
            $ext = $supportsWebP ? 'webp' : 'jpg';
            $fullPath = $uploadPath . '/' . $filename . '.' . $ext;

            // Iterative compression to hit target size (approx 250KB)
            $quality = 80;
            do {
                if ($supportsWebP) {
                    \imagewebp($img, $fullPath, $quality);
                } else {
                    \imagejpeg($img, $fullPath, $quality);
                }
                
                $size = \filesize($fullPath);
                if ($size > 250 * 1024) {
                    $quality -= 10;
                    if ($quality < 20) {
                        // Downscale if quality reduction isn't enough
                        $currW = \imagesx($img);
                        $currH = \imagesy($img);
                        $newW = \floor($currW * 0.8);
                        $newH = \floor($currH * 0.8);
                        $tmp = \imagecreatetruecolor($newW, $newH);
                        \imagealphablending($tmp, false);
                        \imagesavealpha($tmp, true);
                        \imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newW, $newH, $currW, $currH);
                        \imagedestroy($img);
                        $img = $tmp;
                        $quality = 70;
                    }
                }
            } while ($size > 250 * 1024 && \imagesx($img) > 100);

            \imagedestroy($img);
            return '/' . \trim($folder, '/') . '/' . $filename . '.' . $ext;

        } catch (\Exception $e) {
            // Final safety net
            $finalName = $filename . '.' . $extension;
            $file->move(\public_path($folder), $finalName);
            return '/' . \trim($folder, '/') . '/' . $finalName;
        }
    }
}
