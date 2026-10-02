# Registration form on Netlify

The static form in `html/register.html` is named `club-registration`. Netlify detects its named fields at deployment. The script sends a URL-encoded POST to the site root and shows the existing confirmation animation after a successful response.

## Owner setup

1. Open this site's Forms area in Netlify and enable form detection if it is disabled.
2. Deploy the updated website after enabling detection.
3. Confirm that `club-registration` appears in Forms.
4. Under Forms → Submission notifications → Add notification, add an Email notification for `club-registration` to `contact.0161active@gmail.com`.
5. Submit one application from the deployed website with two training sessions. Confirm both sessions, pricing, contact details and additional information appear in Netlify and in the notification email. This live check has not been performed.

Netlify stores the application. Email notifications require the dashboard setup above; the recipient is not configured by client-side JavaScript. Applications are reviewed manually and do not automatically change `clubs.json`.

## Submitted details

The form includes club name, sport, area, description, audience, pricing type, paid amount, taster count, booking requirement, email, website/social link and additional information. `schedule` and `meeting` contain readable summaries. `training-sessions` preserves every session's day, start/end time, meeting point and special considerations as JSON. Disabled paid fields are omitted when Free or Unknown is selected.

## Failure and spam handling

Required fields are validated before sending. While sending, the button is disabled. A failed request displays an error and keeps all answers for retry. Local previews do not send submissions or show success. The hidden `bot-field` is Netlify's honeypot; suspected spam may be filtered even when the request returns successfully, so inspect the Forms spam area if an application is missing.

Sources: https://docs.netlify.com/manage/forms/setup/ and https://docs.netlify.com/manage/forms/submissions/ and https://docs.netlify.com/manage/forms/spam-filters/
