<!doctype html>
<html lang="en">
<head>
  <!-- League page: a shared frame for division identity and participating teams. -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{title}}</title>
  <meta name="description" content="{{description}}">
  <link rel="canonical" href="{{pageUrl}}">
  <link rel="icon" type="image/png" href="/img/0161%20Active_Logo.png">
  <link rel="stylesheet" href="/css/0161_Page.css?v=20261009-breakpoints">
  <link rel="stylesheet" href="/css/site-nav.css?v=20261009-breakpoints">
  <link rel="stylesheet" href="/css/sport-glossary.css?v=20261009-league-pages">
  <link rel="stylesheet" href="/css/site-footer.css">
  <link rel="stylesheet" href="/css/cookie-settings.css">
  <link rel="stylesheet" href="/css/accessibility.css">
  <link rel="stylesheet" href="/css/club-verification.css">
  <script defer src="/js/site-nav.js?v=20261009-static-navigation"></script>
  <script defer src="/js/cookie-settings.js"></script>
  <script defer src="/js/accessibility.js"></script>
</head>
<body class="sport-glossary-body">
<!-- Generated league page: edit templates/league-page.inc and rebuild. -->
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div data-site-nav></div>
  <main class="sport-glossary-page" id="main-content" tabindex="-1">
    <!-- League identity: one coverage eyebrow and the league's primary heading. -->
    <header class="sport-glossary-intro">
      <!-- Back navigation: return to this league's sport glossary. -->
      <a class="league-back-link" href="{{sportGlossaryUrl}}">← Back to {{sportName}}</a>
      <p class="league-card__eyebrow">{{coverageLabel}}</p>
      <h1>{{leagueName}}</h1>
    </header>
    <!-- Participating teams: identify the parent club and link to its profile or supplied website. -->
    <section class="sport-club-directory" aria-label="Participating teams">
      <ol class="sport-club-list" aria-label="Teams participating in this league">{{teamRows}}</ol>
    </section>
  </main>
  {{footer}}
</body>
</html>
