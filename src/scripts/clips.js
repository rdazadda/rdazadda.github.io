const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const play = (video) => video.play().catch(() => {});

if (!reduceMotion) {
  const onScreen = new IntersectionObserver((changes) => {
    for (const { target, isIntersecting } of changes) {
      if (isIntersecting) play(target);
      else target.pause();
    }
  });

  for (const video of document.querySelectorAll('[data-clip]')) {
    onScreen.observe(video);
    video.addEventListener('mouseenter', () => video.pause());
    video.addEventListener('mouseleave', () => play(video));
  }
}
