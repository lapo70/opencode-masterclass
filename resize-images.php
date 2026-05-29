<?php
/**
 * Massresize av bilder
 *
 * Användning: php resize-images.php /sökväg/till/källa /sökväg/till/mål [maxbredd] [maxhöjd]
 * Exempel:    php resize-images.php /var/www/html/wp-content/uploads/gallery /var/www/html/wp-content/uploads/gallery-resized 1920 1080
 *
 * Standard: 1920x1080 om inget anges
 */

$source = $argv[1] ?? null;
$dest   = $argv[2] ?? null;
$max_w  = isset($argv[3]) ? intval($argv[3]) : 1920;
$max_h  = isset($argv[4]) ? intval($argv[4]) : 1080;

if (!$source || !$dest) {
    die("Användning: php resize-images.php <källmapp> <mål-mapp> [maxbredd] [maxhöjd]\n");
}
if (!is_dir($source)) {
    die("Källmappen finns inte: $source\n");
}

$extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$count = 0;
$errors = 0;

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS)
);

foreach ($iterator as $file) {
    if (!$file->isFile()) continue;

    $ext = strtolower($file->getExtension());
    if (!in_array($ext, $extensions)) continue;

    $relative = $iterator->getSubPathName();
    $target = $dest . '/' . $relative;
    $target_dir = dirname($target);

    if (!is_dir($target_dir)) {
        mkdir($target_dir, 0755, true);
    }

    if (resize_image($file->getPathname(), $target, $max_w, $max_h)) {
        $count++;
        echo "OK: $relative\n";
    } else {
        $errors++;
        echo "FEL: $relative\n";
    }
}

echo "\nKlart! $count bilder omgjorda, $errors fel.\n";

function resize_image($src, $dst, $max_w, $max_h) {
    list($orig_w, $orig_h, $type) = @getimagesize($src);
    if (!$orig_w) return false;

    if ($orig_w <= $max_w && $orig_h <= $max_h) {
        return copy($src, $dst);
    }

    $ratio = min($max_w / $orig_w, $max_h / $orig_h);
    $new_w = round($orig_w * $ratio);
    $new_h = round($orig_h * $ratio);

    $src_img = match ($type) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($src),
        IMAGETYPE_PNG  => @imagecreatefrompng($src),
        IMAGETYPE_GIF  => @imagecreatefromgif($src),
        IMAGETYPE_WEBP => @imagecreatefromwebp($src),
        default        => false,
    };
    if (!$src_img) return false;

    $dst_img = imagecreatetruecolor($new_w, $new_h);
    imagecopyresampled($dst_img, $src_img, 0, 0, 0, 0, $new_w, $new_h, $orig_w, $orig_h);

    $result = match ($type) {
        IMAGETYPE_JPEG => imagejpeg($dst_img, $dst, 85),
        IMAGETYPE_PNG  => imagepng($dst_img, $dst, 6),
        IMAGETYPE_GIF  => imagegif($dst_img, $dst),
        IMAGETYPE_WEBP => imagewebp($dst_img, $dst, 85),
        default        => false,
    };

    imagedestroy($src_img);
    imagedestroy($dst_img);
    return $result;
}
