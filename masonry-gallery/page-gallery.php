<?php
/**
 * Template Name: Masonry Gallery
 */
$requested_folder = isset($_GET['folder']) ? trim($_GET['folder']) : '';
$folders = masonry_get_folders();
$folder = in_array($requested_folder, $folders) ? $requested_folder : '';
$base_url = get_permalink();
get_header();
?>
<div class="container gallery-container">
    <?php if ($folder) :
        $images = masonry_get_images($folder);
        $current_key = array_search($folder, $folders);
    ?>
        <h2 class="gallery-title"><?php echo esc_html($folder); ?></h2>

        <?php if (empty($images)) : ?>
            <p class="no-images">Inga bilder hittades i denna mapp.</p>
        <?php else : ?>
            <?php $cols = min(count($images), 4); ?>
            <div class="masonry-grid cols-<?php echo $cols; ?>">
                <?php foreach ($images as $image) : ?>
                    <div class="masonry-item">
                        <a href="<?php echo esc_url($image['url']); ?>" class="gallery-link">
                            <img src="<?php echo esc_url($image['url']); ?>"
                                 alt="<?php echo esc_attr($image['name']); ?>"
                                 loading="lazy">
                        </a>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <nav class="folder-nav">
            <a href="<?php echo esc_url($base_url); ?>" class="btn">&larr; Alla album</a>
            <?php if ($current_key > 0) : ?>
                <a href="<?php echo esc_url(add_query_arg('folder', $folders[$current_key - 1], $base_url)); ?>" class="btn">&larr; <?php echo esc_html($folders[$current_key - 1]); ?></a>
            <?php endif; ?>
            <?php if (isset($folders[$current_key + 1])) : ?>
                <a href="<?php echo esc_url(add_query_arg('folder', $folders[$current_key + 1], $base_url)); ?>" class="btn"><?php echo esc_html($folders[$current_key + 1]); ?> &rarr;</a>
            <?php endif; ?>
        </nav>

    <?php else :
        $per_page = 20;
        $total_folders = count($folders);
        $total_pages = max(1, ceil($total_folders / $per_page));
        $current_page = isset($_GET['sida']) ? max(1, min($total_pages, intval($_GET['sida']))) : 1;
        $offset = ($current_page - 1) * $per_page;
        $page_folders = array_slice($folders, $offset, $per_page);
    ?>
        <h2 class="gallery-title">Galleri</h2>
        <p class="gallery-subtitle">Välj ett album (<?php echo $total_folders; ?> album totalt)</p>

        <?php if (empty($page_folders)) : ?>
            <p class="no-images">Inga album hittades. Lägg till mappar i <code><?php echo esc_html(str_replace(ABSPATH, '', MASONRY_GALLERY_PATH)); ?></code></p>
        <?php else : ?>
            <div class="masonry-grid">
                <?php foreach ($page_folders as $folder_name) :
                    $random_image = masonry_get_random_image($folder_name);
                ?>
                    <div class="masonry-item folder-card">
                        <a href="<?php echo esc_url(add_query_arg('folder', $folder_name, $base_url)); ?>">
                            <?php if ($random_image) : ?>
                                <div class="folder-thumb">
                                    <img src="<?php echo esc_url($random_image['url']); ?>"
                                         alt="<?php echo esc_attr($folder_name); ?>"
                                         loading="lazy">
                                </div>
                            <?php else : ?>
                                <div class="folder-thumb placeholder">
                                    <span>Inga bilder</span>
                                </div>
                            <?php endif; ?>
                            <span class="folder-name"><?php echo esc_html($folder_name); ?></span>
                        </a>
                    </div>
                <?php endforeach; ?>
            </div>

            <?php if ($total_pages > 1) : ?>
                <nav class="pagination">
                    <?php if ($current_page > 1) : ?>
                        <a href="<?php echo esc_url(add_query_arg('sida', $current_page - 1, $base_url)); ?>" class="btn btn-small">&larr; Föregående</a>
                    <?php endif; ?>
                    <span class="pagination-info">Sida <?php echo $current_page; ?> / <?php echo $total_pages; ?></span>
                    <?php if ($current_page < $total_pages) : ?>
                        <a href="<?php echo esc_url(add_query_arg('sida', $current_page + 1, $base_url)); ?>" class="btn btn-small">Nästa &rarr;</a>
                    <?php endif; ?>
                </nav>
            <?php endif; ?>
        <?php endif; ?>
    <?php endif; ?>
</div>
<?php get_footer(); ?>
