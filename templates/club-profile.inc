<!doctype html>
<html lang="en">
<head>
  <!-- Page metadata: generate the title, description and canonical URL from club data. -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{{description}}">
  <title>{{title}}</title>
  <link rel="stylesheet" href="../../css/0161_Page.css">
  <link rel="stylesheet" href="../../css/club-profile.css">
  <link rel="stylesheet" href="/css/site-nav.css?v=20261007-cleanup">
  <script defer src="/js/site-nav.js?v=20261007-cleanup"></script>
  <link rel="canonical" href="{{pageUrl}}">

  <!-- Social preview -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="0161 Active">
  <meta property="og:locale" content="en_GB">
  <meta property="og:title" content="{{title}}">
  <meta property="og:description" content="{{description}}">
  <meta property="og:url" content="{{pageUrl}}">
  <meta name="twitter:card" content="{{twitterCard}}">
  <meta name="twitter:title" content="{{title}}">
  <meta name="twitter:description" content="{{description}}">
{{socialImageTags}}
  <!-- /Social preview -->

  <!-- Shared styles and controls: keep navigation, privacy and accessibility consistent. -->
  <link rel="stylesheet" href="/css/site-footer.css">
  <link rel="stylesheet" href="/css/cookie-settings.css">
  <script defer src="/js/cookie-settings.js"></script>
  <link rel="stylesheet" href="/css/accessibility.css">
  <script defer src="/js/accessibility.js"></script>
  <link rel="stylesheet" href="/css/club-verification.css">
</head>
<body class="profile-body">
  <a class="skip-link" href="#club-profile-root">Skip to main content</a>
  <!-- Site navigation: reuse the global navigation on every club profile. -->
  <div data-site-nav></div>

  <!-- Profile content: embed the shared renderer's output for viewing without JavaScript. -->
  <main class="profile-main" id="club-profile-root" data-club-id="{{clubId}}" tabindex="-1">
    {{profileHtml}}
  </main>

  <!-- Footer and enhancements: share the footer and enable calendar downloads. -->
{{footer}}
  <script type="module" src="../../js/club-profile.js"></script>
</body>
</html>
