<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    <header class="site-header">
        <div class="container">
            <h1 class="site-title">
                <a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
            </h1>
            <?php
            $requested_folder = isset($_GET['folder']) ? trim($_GET['folder']) : '';
            $all_folders = masonry_get_folders();
            $folder = in_array($requested_folder, $all_folders) ? $requested_folder : '';
            if ($folder) :
                $base_url = get_permalink();
            ?>
                <nav class="gallery-nav">
                    <a href="<?php echo esc_url($base_url); ?>" class="btn">&larr; Alla album</a>
                    <span class="current-folder"><?php echo esc_html($folder); ?></span>
                    <div class="folder-pagination">
                        <?php $prev = masonry_get_adjacent_folder($folder, 'prev'); ?>
                        <?php $next = masonry_get_adjacent_folder($folder, 'next'); ?>
                        <?php if ($prev) : ?>
                            <a href="<?php echo esc_url(add_query_arg('folder', $prev, $base_url)); ?>" class="btn btn-small">&larr; Föregående</a>
                        <?php endif; ?>
                        <?php if ($next) : ?>
                            <a href="<?php echo esc_url(add_query_arg('folder', $next, $base_url)); ?>" class="btn btn-small">Nästa &rarr;</a>
                        <?php endif; ?>
                    </div>
                </nav>
            <?php endif; ?>
        </div>
    </header>
    <main class="site-main">
