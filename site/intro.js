// The intro video's player replaces its still picture once the visitor presses play, so nothing is asked of
// YouTube before then.
const link = document.querySelector("a.video");
link.addEventListener("click", (e) => {
  if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const player = document.createElement("iframe");
  player.src = "https://www.youtube-nocookie.com/embed/" + new URL(link.href).searchParams.get("v") + "?autoplay=1&rel=0";
  player.title = link.querySelector("img").alt;
  player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  player.referrerPolicy = "strict-origin-when-cross-origin";
  const box = document.createElement("div");
  box.className = "video";
  box.append(player);
  link.replaceWith(box);
  player.focus();
});
