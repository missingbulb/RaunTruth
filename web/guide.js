// The guide to an outside window (req/shell/account/consent-guide): before the page opens a window of the identity
// provider's or the remote store's that will ask the user something, the steps that window will show, each with a
// screenshot and what to click framed. Its go button lets the asking go on in that click; the guide then waits until
// told the window answered. The steps and their words are the caller's: {title, go, wait, steps: [{text (HTML), shot
// (an image's URL), from (where the screenshot was published)}]}.
"use strict";

export function guide(dialog) {
  const $ = (s) => dialog.querySelector(s);
  // waiting: {ok, fail} of the guide waiting for its go button
  let waiting = null;
  const settle = (how) => { const w = waiting; waiting = null; w?.[how](); };

  const draw = (g) => {
    $("#guide-title").textContent = g.title;
    $("#guide-go").textContent = g.go;
    $("#guide-wait").textContent = g.wait;
    $("#guide-steps").innerHTML = g.steps.map((s) => {
      const pic = s.shot ? `<figure><img src="${s.shot}" alt=""><figcaption>${s.from}</figcaption></figure>` : "";
      return `<li><p>${s.text}</p>${pic}</li>`;
    }).join("");
    dialog.classList.remove("waiting");
  };

  $("#guide-go").addEventListener("click", () => { dialog.classList.add("waiting"); settle("ok"); });
  $("#guide-cancel").addEventListener("click", () => dialog.close());
  // the browser tells of a close a moment after it: by then the guide may be open again, for another asking
  dialog.addEventListener("close", () => { if (!dialog.open) settle("fail"); });

  return {
    // in the user's click: the guide g; resolves in the click on its go button, so the window can be asked for
    // there; rejects, with cancelled set, when closed before
    open(g) {
      settle("fail");
      draw(g);
      if (dialog.open) dialog.close();
      dialog.showModal();
      return new Promise((ok, fail) => { waiting = { ok, fail: () => fail(Object.assign(new Error("the guide was closed"), { cancelled: true })) }; });
    },
    // the window answered
    done() { if (dialog.open) dialog.close(); },
  };
}
