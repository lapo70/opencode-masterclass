document.addEventListener('DOMContentLoaded', function () {
    var images = [];
    var currentIndex = 0;
    var overlay = null;

    var links = document.querySelectorAll('.gallery-link');
    links.forEach(function (link, index) {
        images.push(link.href);
        link.addEventListener('click', function (e) {
            e.preventDefault();
            currentIndex = index;
            openLightbox();
        });
    });

    function openLightbox() {
        if (overlay) closeLightbox();

        overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';

        var prevBtn = document.createElement('button');
        prevBtn.className = 'lightbox-nav lightbox-prev';
        prevBtn.innerHTML = '&#8249;';

        var nextBtn = document.createElement('button');
        nextBtn.className = 'lightbox-nav lightbox-next';
        nextBtn.innerHTML = '&#8250;';

        var content = document.createElement('div');
        content.className = 'lightbox-content';

        var img = document.createElement('img');
        img.className = 'lightbox-image';
        img.src = images[currentIndex];
        img.alt = '';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'lightbox-close';
        closeBtn.innerHTML = '&times;';

        var counter = document.createElement('div');
        counter.className = 'lightbox-counter';
        counter.textContent = (currentIndex + 1) + ' / ' + images.length;

        content.appendChild(img);
        content.appendChild(closeBtn);
        content.appendChild(counter);
        overlay.appendChild(prevBtn);
        overlay.appendChild(content);
        overlay.appendChild(nextBtn);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        updateNavButtons();

        function navigate(direction) {
            currentIndex += direction;
            if (currentIndex < 0) currentIndex = images.length - 1;
            if (currentIndex >= images.length) currentIndex = 0;
            var newImg = overlay.querySelector('.lightbox-image');
            newImg.src = images[currentIndex];
            counter.textContent = (currentIndex + 1) + ' / ' + images.length;
            updateNavButtons();
        }

        function updateNavButtons() {
            prevBtn.style.display = images.length > 1 ? '' : 'none';
            nextBtn.style.display = images.length > 1 ? '' : 'none';
        }

        prevBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            navigate(-1);
        });

        nextBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            navigate(1);
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeLightbox();
            }
        });

        content.addEventListener('click', function (e) {
            var rect = content.getBoundingClientRect();
            var x = e.clientX - rect.left;
            if (x < rect.width / 3) {
                navigate(-1);
            } else if (x > rect.width * 2 / 3) {
                navigate(1);
            }
        });

        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            closeLightbox();
        });

        document.addEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
        if (!overlay || !document.body.contains(overlay)) return;
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            var prevBtn = overlay.querySelector('.lightbox-prev');
            if (prevBtn) prevBtn.click();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            var nextBtn = overlay.querySelector('.lightbox-next');
            if (nextBtn) nextBtn.click();
        }
    }

    function closeLightbox() {
        if (overlay) {
            overlay.remove();
            overlay = null;
            document.body.style.overflow = '';
            document.removeEventListener('keydown', onKeydown);
        }
    }
});
