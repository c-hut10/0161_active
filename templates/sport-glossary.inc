<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{{description}}">
  <title>{{title}}</title>
  <link rel="stylesheet" href="../../css/0161_Page.css?v=20261009-breakpoints">
  <link rel="stylesheet" href="/css/site-nav.css?v=20261007-cleanup">
  <link rel="stylesheet" href="../../css/sport-glossary.css?v=20261010-smooth-leagues">
  <script defer src="/js/site-nav.js?v=20261007-cleanup"></script>
  <script type="module" src="../../js/sport-glossary.js?v=20261010-smooth-leagues"></script>
  <link rel="stylesheet" href="/css/site-footer.css">
  <link rel="stylesheet" href="/css/cookie-settings.css">
  <script defer src="/js/cookie-settings.js"></script>
  <link rel="stylesheet" href="/css/accessibility.css">
  <script defer src="/js/accessibility.js"></script>
  <link rel="stylesheet" href="/css/club-verification.css">
  <link rel="icon" type="image/png" href="/img/0161%20Active_Logo.png">
</head>
<body class="sport-glossary-body" data-sport="{{sportSlug}}">
<!-- Generated sport glossary: edit templates/sport-glossary.inc and rebuild. -->
<a class="skip-link" href="#main-content">Skip to main content</a>
  <div data-site-nav></div>

  <!-- Sport glossary: provide one reusable, filtered club directory for every sport category. -->
  <main class="sport-glossary-page" id="main-content" tabindex="-1">
    <header class="sport-glossary-intro">
      <!-- Eyebrow navigation: link the site name home and the directory label to all sports. -->
      <p class="sport-glossary-eyebrow"><a href="/">0161 ACTIVE</a><span aria-hidden="true"> · </span><a href="directory.html">SPORT DIRECTORY</a></p>
      <div class="sport-glossary-intro__row">
        <div><h1 id="sport-title">{{sportName}}</h1></div>
      </div>
    </header>

    <!-- League overview precedes the filters; counts use the full sport list. -->
    {{leagueCards}}

    <section class="sport-glossary-filters" aria-label="Filter clubs">
      <label>SEARCH CLUBS
        <input id="club-search" type="search" placeholder="Club name" autocomplete="off">
      </label>
      <label>AREA
        <select id="area-filter">{{areaOptions}}</select>
      </label>
      <label>DAY
        <select id="day-filter">
          <option value="all">Any day</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
          <option value="7">Sunday</option>
        </select>
      </label>
    </section>

    <noscript><p class="sport-glossary-message">You can browse every club below. Enable JavaScript to use the filters.</p></noscript>
    <!-- Club rows are generated at build time, then updated by browser filters. -->
    <section class="sport-club-directory" aria-label="Club results">
      <div class="sport-club-directory__heading"><p class="sport-glossary-eyebrow" id="club-count" aria-live="polite">{{clubCount}} CLUBS SHOWN</p></div>
      <p class="sport-glossary-message" id="directory-message" role="status"{{messageHidden}}>{{message}}</p>
      <ol class="sport-club-list" id="club-list" aria-label="{{sportName}} clubs">{{clubRows}}</ol>
    </section>
  </main>

  <footer class="site-footer" data-site-footer>
  <div class="site-footer__inner">
    <div class="site-footer__contact">
      <p class="site-footer__label">CONTACT INFO</p>
      <a class="site-footer__email" href="mailto:contact.0161active@gmail.com">contact.0161active@gmail.com</a>
    </div>
    <nav class="site-footer__links" aria-label="Footer navigation">
      <a href="/html/contact.html">Contact us</a>
      <a href="/html/register.html">Register your club</a>
      <a href="/html/contact.html#corrections">Report incorrect information</a>
      <a href="/html/privacy.html">Privacy policy</a>
      <a href="/html/privacy.html#cookies" data-cookie-settings>Cookie settings</a>
      <a href="/html/contact.html" data-accessibility-settings>Accessibility settings</a>
    </nav>
  </div>
</footer>
</body>
</html>
