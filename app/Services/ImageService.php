<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class ImageService
{
    /**
     * Compress, resize, and convert uploaded images to WebP for optimal web performance.
     * Designed for shared hosting with limited RAM — processes images in-place with GD.
     * 
     * Pipeline:
     * 1. SVG bypass (vector, already tiny)
     * 2. Load with GD (JPEG/PNG/WebP/GIF)
     * 3. Strip alpha for non-PNG (saves bytes)
     * 4. Smart resize to maxWidth
     * 5. Iterative compression targeting ≤150KB
     * 6. WebP output (JPEG fallback if GD lacks WebP)
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $folder Relative path from public/
     * @param string $prefix Filename prefix (e.g. AVATAR, LOGO)
     * @param int $maxWidth Maximum width in pixels
     * @return string|null Relative URL path to the saved file
     */
    public function optimize($file, $folder, $prefix = 'IMG', $maxWidth = 1200)
    {
        $extension = \strtolower($file->getClientOriginalExtension());
        $userId = \auth()->id() ?? 'guest';
        $filename = $prefix . '_' . \date('Ymd_His') . '_' . $userId;

        // Ensure upload directory exists
        $uploadPath = \public_path($folder);
        if (!File::exists($uploadPath)) {
            File::makeDirectory($uploadPath, 0755, true);
        }

        // --- 🛡️ EMERGENCY BYPASS (If GD is missing) ---
        if (!\extension_loaded('gd')) {
            $ext = ($extension === 'svg') ? 'svg' : $extension;
            $finalName = $filename . '.' . $ext;
            $file->move($uploadPath, $finalName);
            return '/' . \trim($folder, '/') . '/' . $finalName;
        }

        // --- 📂 SVG — already vector, skip raster processing ---
        if ($extension === 'svg') {
            $finalName = $filename . '.svg';
            $file->move($uploadPath, $finalName);
            return '/' . \trim($folder, '/') . '/' . $finalName;
        }

        try {
            // Load image resource based on detected format
            $img = $this->loadImage($file->getRealPath(), $extension);

            if (!$img) {
                // GD couldn't read it — save original as-is
                $finalName = $filename . '.' . $extension;
                $file->move($uploadPath, $finalName);
                return '/' . \trim($folder, '/') . '/' . $finalName;
            }

            // --- 📏 SMART RESIZE (only downscale, never upscale) ---
            $img = $this->resizeDown($img, $maxWidth);

            // --- 🚀 COMPRESS & SAVE ---
            $supportsWebP = \function_exists('imagewebp');
            $ext = $supportsWebP ? 'webp' : 'jpg';
            $fullPath = $uploadPath . '/' . $filename . '.' . $ext;

            $this->compressToTarget($img, $fullPath, $supportsWebP);

            \imagedestroy($img);
            return '/' . \trim($folder, '/') . '/' . $filename . '.' . $ext;

        } catch (\Exception $e) {
            // Final safety net — save original untouched
            \Log::warning("ImageService: Optimization failed, saving original. Error: " . $e->getMessage());
            $finalName = $filename . '.' . $extension;
            $file->move($uploadPath, $finalName);
            return '/' . \trim($folder, '/') . '/' . $finalName;
        }
    }

    /**
     * Load an image resource from a file path using GD.
     * Handles JPEG, PNG (with alpha), WebP, and GIF.
     */
    private function loadImage(string $path, string $extension)
    {
        $img = null;

        switch ($extension) {
            case 'jpeg':
            case 'jpg':
                $img = @\imagecreatefromjpeg($path);
                break;
            case 'png':
                $img = @\imagecreatefrompng($path);
                if ($img) {
                    \imagepalettetotruecolor($img);
                    \imagealphablending($img, true);
                    \imagesavealpha($img, true);
                }
                break;
            case 'webp':
                if (\function_exists('imagecreatefromwebp')) {
                    $img = @\imagecreatefromwebp($path);
                }
                break;
            case 'gif':
                $img = @\imagecreatefromgif($path);
                break;
            default:
                return null;
        }

        return $img ?: null;
    }

    /**
     * Resize image down to maxWidth while maintaining aspect ratio.
     * Never upscales — if image is smaller than target, it's returned as-is.
     */
    private function resizeDown($img, int $maxWidth)
    {
        $width = \imagesx($img);
        $height = \imagesy($img);

        if ($width <= $maxWidth) {
            return $img;
        }

        $newWidth = $maxWidth;
        $newHeight = (int) \floor($height * ($maxWidth / $width));

        $tmp = \imagecreatetruecolor($newWidth, $newHeight);
        // Preserve transparency
        \imagealphablending($tmp, false);
        \imagesavealpha($tmp, true);
        $transparent = \imagecolorallocatealpha($tmp, 0, 0, 0, 127);
        \imagefill($tmp, 0, 0, $transparent);

        \imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        \imagedestroy($img);

        return $tmp;
    }

    /**
     * Iterative compression to achieve target file size (≤150KB).
     * 
     * Strategy:
     * 1. Start at quality 72 (WebP) or 75 (JPEG) — visually lossless for web
     * 2. If file > 150KB → reduce quality by 8 per iteration
     * 3. If quality drops below 20 → downscale image by 25% and reset quality
     * 4. Safety stop at image width < 100px to prevent infinite loop
     * 
     * Target 150KB is optimized for shared hosting bandwidth:
     * - Forces fast load on 3G/4G mobile connections
     * - Reduces storage usage on limited hosting plans
     * - CDN-friendly file sizes
     */
    private function compressToTarget(&$img, string $fullPath, bool $useWebP): void
    {
        $targetBytes = 150 * 1024; // 150KB target — optimal for shared hosting
        $quality = $useWebP ? 72 : 75; // WebP is more efficient, can start lower

        $attempts = 0;
        $maxAttempts = 8; // Safety limit

        do {
            if ($useWebP) {
                \imagewebp($img, $fullPath, $quality);
            } else {
                // Enable interlacing for progressive JPEG (perceived faster loading)
                \imageinterlace($img, true);
                \imagejpeg($img, $fullPath, $quality);
            }

            $size = \filesize($fullPath);
            // Clear stat cache for accurate size on next iteration
            \clearstatcache(true, $fullPath);

            if ($size <= $targetBytes) {
                break; // Target achieved
            }

            $quality -= 8;
            $attempts++;

            if ($quality < 20) {
                // Quality reduction isn't enough — downscale image by 25%
                $currW = \imagesx($img);
                $currH = \imagesy($img);
                $newW = (int) \floor($currW * 0.75);
                $newH = (int) \floor($currH * 0.75);

                if ($newW < 100) break; // Don't shrink below usable size

                $tmp = \imagecreatetruecolor($newW, $newH);
                \imagealphablending($tmp, false);
                \imagesavealpha($tmp, true);
                $transparent = \imagecolorallocatealpha($tmp, 0, 0, 0, 127);
                \imagefill($tmp, 0, 0, $transparent);

                \imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newW, $newH, $currW, $currH);
                \imagedestroy($img);
                $img = $tmp;
                $quality = $useWebP ? 65 : 70; // Reset quality after downscale
            }

        } while ($attempts < $maxAttempts);
    }
}
