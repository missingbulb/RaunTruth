"""Makes the screenshots of Google's own screens that the page's Google guide shows (web/guide-shots/), from the
pictures published where SOURCES says: cropped to the screen, framed where to click, and a private person's address
painted out. Run once by hand when Google changes a screen; the page never fetches these sources.
    python3 dev/tools/google_guide/make_images.py
"""
import io
import os
import urllib.request

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "web", "guide-shots")
SHOTS = "https://d33v4339jhl8k0.cloudfront.net/docs/assets/5cae054c2c7d3a392f9cdd66/images/"
# name: (url, where it was published)
SOURCES = {
    "advanced": (SHOTS + "6878928452724d3c54de8f0b/file-7UpDXjzXPW.png", "scannerapphelp.ifunplay.com/article/293"),
    "unsafe": (SHOTS + "687897421fd2e3184b5c2ebb/file-cjUxtSl8Yn.png", "scannerapphelp.ifunplay.com/article/293"),
    "consent-file": (SHOTS + "6878b8ac13d950405eff6db5/file-i6GC5VNiSO.png", "scannerapphelp.ifunplay.com/article/293"),
    # CC BY 4.0, Google
    "consent-read": ("https://developers.google.com/static/identity/protocols/oauth2/images/examples/identity-and-nonidentity.png",
                     "developers.google.com/identity/protocols/oauth2/resources/granular-permissions"),
}
# the frame the third-party shots already draw around what to click, matched in the frames added here
FRAME = (240, 50, 90)
WIDTH = 520


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req).read())).convert("RGB")


def save(name, im):
    im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=82, method=6)


def phone(name, top, bottom, blank=None):
    # the phone shots: cropped below the browser's bar, in the 693-wide coordinates they were read in
    im = fetch(SOURCES[name][0])
    k = im.width / 693
    if blank:
        ImageDraw.Draw(im).rectangle([round(v * k) for v in blank], fill="white")
    save(name, im.crop((0, round(top * k), im.width, round(bottom * k))))


def main():
    os.makedirs(OUT, exist_ok=True)
    phone("advanced", 270, 870)
    phone("unsafe", 270, 1070)
    # the account's email and its initials are a private person's
    phone("consent-file", 400, 1130, blank=(30, 585, 460, 640))
    im = fetch(SOURCES["consent-read"][0])
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((378, 266, 424, 310), 8, outline=FRAME, width=4)
    d.rounded_rectangle((226, 826, 420, 874), 10, outline=FRAME, width=4)
    save("consent-read", im.crop((0, 95, im.width, 900)))


if __name__ == "__main__":
    main()
