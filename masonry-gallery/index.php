<?php get_header(); ?>
<div class="container">
    <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
        <article <?php post_class(); ?>>
            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
            <div class="entry-content"><?php the_excerpt(); ?></div>
        </article>
    <?php endwhile; endif; ?>
</div>
<?php get_footer(); ?>
