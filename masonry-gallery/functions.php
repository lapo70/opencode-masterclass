<?php
function masonry_gallery_setup() {
    add_theme_support('title-tag');
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption']);
}
add_action('after_setup_theme', 'masonry_gallery_setup');

function masonry_gallery_scripts() {
    wp_enqueue_style('masonry-gallery-style', get_stylesheet_uri(), [], '1.0');
    wp_enqueue_style('masonry-gallery-main', get_template_directory_uri() . '/assets/css/masonry.css', [], '1.0');
    wp_enqueue_script('masonry-gallery-script', get_template_directory_uri() . '/assets/js/masonry.js', [], '1.0', true);
}
add_action('wp_enqueue_scripts', 'masonry_gallery_scripts');

if (!defined('MASONRY_GALLERY_PATH')) {
    define('MASONRY_GALLERY_PATH', WP_CONTENT_DIR . '/uploads/gallery');
}
if (!defined('MASONRY_GALLERY_URL')) {
    define('MASONRY_GALLERY_URL', content_url('/uploads/gallery'));
}

function masonry_get_folders() {
    $path = MASONRY_GALLERY_PATH;
    if (!is_dir($path)) return [];
    $items = array_diff(scandir($path), ['.', '..']);
    $folders = [];
    foreach ($items as $item) {
        if (is_dir($path . '/' . $item)) {
            $folders[] = $item;
        }
    }
    sort($folders);
    return $folders;
}

function masonry_get_images($folder) {
    $path = MASONRY_GALLERY_PATH . '/' . $folder;
    if (!is_dir($path)) return [];
    $extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
    $images = [];
    foreach ($extensions as $ext) {
        foreach (glob($path . '/*.' . $ext) as $file) {
            $images[] = [
                'url' => MASONRY_GALLERY_URL . '/' . $folder . '/' . basename($file),
                'name' => basename($file),
            ];
        }
        foreach (glob($path . '/*.' . strtoupper($ext)) as $file) {
            $images[] = [
                'url' => MASONRY_GALLERY_URL . '/' . $folder . '/' . basename($file),
                'name' => basename($file),
            ];
        }
    }
    usort($images, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    return $images;
}

function masonry_get_random_image($folder) {
    $images = masonry_get_images($folder);
    if (empty($images)) return null;
    return $images[array_rand($images)];
}

function masonry_get_adjacent_folder($current_folder, $direction = 'next') {
    $folders = masonry_get_folders();
    $key = array_search($current_folder, $folders);
    if ($key === false) return null;
    if ($direction === 'next') {
        return isset($folders[$key + 1]) ? $folders[$key + 1] : null;
    } else {
        return isset($folders[$key - 1]) ? $folders[$key - 1] : null;
    }
}
