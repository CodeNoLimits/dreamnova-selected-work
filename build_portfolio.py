# génère portfolio/index.html (portfolio général) à partir de la page de Mike, sans la modifier
import re
src = open("index.html", encoding="utf-8").read()
s = src.replace('"assets/', '"../assets/')

def sub(old, new, count=1):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new, count)

WA = "https://wa.me/972584921492?text=Hi%20David%2C%20I%20saw%20the%20DreamNova%20selected%20work%20page"
sub("<title>Selected Work for Mike Nakh TV — DreamNova Studio</title>", "<title>Selected Work — DreamNova Studio</title>")
sub('content="Curated long-form edits, documentary features, and vertical cutdowns prepared for Mike Nakh TV (@mikenakhtv) by DreamNova Studio."',
    'content="Real client work by DreamNova Studio, Jerusalem: long-form YouTube edits, a 60-minute documentary, a memorial film, vertical reels and live websites."')
s = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Selected Work — DreamNova Studio">', s)
s = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="Long-form edits, a 60-minute documentary, reels and live websites — real client work, playable on the page.">', s)
s = re.sub(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="https://codenolimits.github.io/dreamnova-selected-work/portfolio/">', s)
sub('<span class="nav__badge">FOR @MIKENAKHTV</span>', '<span class="nav__badge">SELECTED WORK</span>')
sub('<a href="#process">72h Workflow</a>', '<a href="#sites">Websites</a>\n      <a href="#process">Workflow</a>')
sub('''<a class="btn btn--gold btn--sm" href="https://www.instagram.com/dreamnovastudiobyamoregroup/" target="_blank" rel="noopener">
      <span>Reply on IG</span>''', f'''<a class="btn btn--gold btn--sm" href="{WA}" target="_blank" rel="noopener">
      <span>WhatsApp</span>''')
sub('<span class="pulse"></span>Curated Video Portfolio · Prepared for Mike Nakh TV</p>', '<span class="pulse"></span>DreamNova Studio · Jerusalem · English, French &amp; Hebrew</p>')
sub('<h1 class="hero__title">Selected work for <em>Mike Nakh TV.</em></h1>', '<h1 class="hero__title">Real clients. <em>Real work.</em></h1>')
s = re.sub(r'<p class="hero__sub">.*?</p>', '''<p class="hero__sub">
          Everything below was made for real clients and is playable right here: <strong>long-form YouTube episodes</strong>, a <strong>60-minute documentary feature</strong>, a <strong>memorial film</strong>, <strong>vertical reels</strong> in three languages, and <strong>live websites &amp; AI agents</strong> you can open and test.
        </p>''', s, count=1, flags=re.S)
sub('''<a class="btn btn--glass" href="#documentaries">
            <span>See 60-Min Documentary Feature</span>''', '''<a class="btn btn--glass" href="#sites">
            <span>See Live Websites &amp; AI</span>''')
sub('<span>Full Studio Portfolio</span>', '<span>DreamNova Main Site</span>')
s = s.replace('href="https://dreamnova-next.vercel.app/en/portfolio/"', 'href="https://dreamnova-next.vercel.app/en/"')
sub("featuring Brian’s English YouTube Shorts and Bistrot Romain Gary’s French evening spots.",
    "featuring Brian’s English YouTube Shorts, Bistrot Romain Gary’s French evening spots and Hebrew reels for a Jerusalem landscaping company.")

def short(mp4, poster, tag, lang, title, ctx):
    return f'''
          <article class="shell">
            <div class="core">
              <div class="player-9x16">
                <video controls playsinline preload="none" poster="../assets/{poster}" src="../assets/{mp4}"></video>
              </div>
              <div class="vcard__body">
                <div>
                  <div class="vcard__top">
                    <span class="tag">{tag}</span>
                    <span class="tag tag--lang">{lang}</span>
                  </div>
                  <h3 class="vcard__title">{title}</h3>
                  <p class="vcard__ctx">{ctx}</p>
                </div>
                <div class="vcard__foot">
                  <span>1080×1920 · Approved by the client</span>
                  <a class="ext-link" href="../assets/{mp4}" target="_blank" rel="noopener">Direct MP4 ↗</a>
                </div>
              </div>
            </div>
          </article>
'''
isr = short("israel_beit_shemesh.mp4", "israel_beit_shemesh.jpg", "Before / After Reel · 23s", "Hebrew",
            "Nitzan Shebagan — Beit Shemesh Garden, Before &amp; After",
            "Ad reel built from the client’s real project photos: bare yard, soil preparation, then the finished garden — Hebrew captions and logo end card.") + \
      short("israel_mevasseret.mp4", "israel_mevasseret.jpg", "Project Reel · 18s", "Hebrew",
            "Nitzan Shebagan — New Private Garden, Mevasseret Zion",
            "Project reel from real photos of a new private garden — slow camera moves, Hebrew captions, logo end card and instrumental music.")
i = s.index('<!-- SECTION 4: OUR LONG-FORM EDITING PROCESS -->')
j = s.rindex('</div>\n      </div>\n    </section>', 0, i)
s = s[:j] + isr + "        " + s[j:]

def site(img, url, tag, lang, title, ctx, host):
    return f'''
          <article class="shell">
            <div class="core">
              <div class="player-16x9">
                <a class="v-cover" href="{url}" target="_blank" rel="noopener" aria-label="Open {host}">
                  <img src="../assets/{img}" alt="{title}" loading="eager">
                  <span class="v-cover__play"><span class="v-cover__dot">↗</span>Open the live site</span>
                </a>
              </div>
              <div class="vcard__body">
                <div>
                  <div class="vcard__top">
                    <span class="tag">{tag}</span>
                    <span class="tag tag--lang">{lang}</span>
                  </div>
                  <h3 class="vcard__title">{title}</h3>
                  <p class="vcard__ctx">{ctx}</p>
                </div>
                <div class="vcard__foot">
                  <span>{host}</span>
                  <a class="ext-link" href="{url}" target="_blank" rel="noopener">Visit ↗</a>
                </div>
              </div>
            </div>
          </article>'''
sites = '''
    <!-- SECTION 4: LIVE WEBSITES & AI -->
    <section class="block" id="sites">
      <div class="container">
        <div class="sec-head">
          <div>
            <p class="eyebrow">04 · Websites &amp; AI Agents (live)</p>
            <h2 class="h2">Live Websites &amp; <em>Working AI.</em></h2>
          </div>
          <p class="sec-lead">
            Not mock-ups: these are online right now. Open them on your phone, switch languages, talk to the voice agent.
          </p>
        </div>
        <div class="long-grid">''' + \
  site("site_nitzan.jpg", "https://nitzan-shebagan.co.il", "Client Website · Live", "Hebrew · English · French",
       "Nitzan Shebagan — Garden Design &amp; Landscaping", "Trilingual showcase site for a Jerusalem landscaping company: cinematic hero, project videos, WhatsApp lead buttons.", "nitzan-shebagan.co.il") + \
  site("site_ava.jpg", "https://dreamnova-voice-demo.vercel.app", "AI Voice Agent · Live Demo", "English · French",
       "Ava — AI Phone Receptionist", "A working voice agent you can talk to: answers the call, detects urgency, books the appointment and hands a clean summary to the team.", "dreamnova-voice-demo.vercel.app") + \
  site("site_leeya.jpg", "https://leeya-3d-en.vercel.app", "Personal-Brand Website · Live", "English · Hebrew · French",
       "LeeyaMedia — YouTube Authority Studio", "Immersive 3D brand site for a YouTube strategist: scroll-driven scenes, sound design, three languages.", "leeya-3d-en.vercel.app") + \
  site("site_next.jpg", "https://dreamnova-next.vercel.app/en/", "Studio Website · Live", "English · French · Hebrew",
       "DreamNova — Our Own Studio Site", "Our flagship: WebGL hero, animated sequences, service catalogue and demos — the level we build for clients.", "dreamnova-next.vercel.app") + '''
        </div>
      </div>
    </section>

'''
sub('    <!-- SECTION 4: OUR LONG-FORM EDITING PROCESS -->', sites + '    <!-- SECTION 5: OUR VIDEO PROCESS -->')
sub('<p class="eyebrow">04 · Built for 40–60 Min YouTube Episodes</p>', '<p class="eyebrow">05 · Video Workflow</p>')
sub('<h2 class="h2">How We Edit Your <em>Long-Form Videos.</em></h2>', '<h2 class="h2">How We Edit <em>Your Videos.</em></h2>')
s = re.sub(r'<h2>Let’s cut your next <em>long-form episode.</em></h2>\s*<p>.*?</p>', '''<h2>Let’s build your <em>next project.</em></h2>
            <p>
              Send a raw Drive folder, a website you want to beat, or just a voice note. David answers personally on WhatsApp.
            </p>''', s, count=1, flags=re.S)
s = re.sub(r'<a class="btn btn--gold" href="https://www.instagram.com/dreamnovastudiobyamoregroup/"[^>]*>\s*<span>Reply on Instagram \(@dreamnovastudiobyamoregroup\)</span>',
           f'<a class="btn btn--gold" href="{WA}" target="_blank" rel="noopener">\n                <span>WhatsApp David (+972 58-492-1492)</span>', s, count=1)
s = re.sub(r'<a class="btn btn--glass" href="https://wa.me/972584921492\?text=Hey[^"]*"[^>]*>\s*<span>Direct WhatsApp \(\+972 58-492-1492\)</span>',
           '<a class="btn btn--glass" href="https://www.instagram.com/dreamnovastudiobyamoregroup/" target="_blank" rel="noopener">\n                <span>Instagram @dreamnovastudiobyamoregroup</span>', s, count=1)
sub('<span>Explore Full DreamNova Portfolio</span>', '<span>DreamNova Main Site</span>')
sub('© 2026 DreamNova Studio · David Amor · Prepared exclusively for Mike Nakh TV (@mikenakhtv)', '© 2026 DreamNova Studio · David Amor · Jerusalem')
sub('dreamnova-next.vercel.app/en/portfolio ↗', 'dreamnova-next.vercel.app ↗')
assert not re.search(r"mike|nakh", s, re.I), re.findall(r".{40}(?:mike|nakh).{40}", s, re.I)
open("portfolio/index.html", "w", encoding="utf-8").write(s)
print("ok", len(s))
