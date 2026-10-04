# Club information retention schedule

Owner: Cian Hutton, 0161_Active.
Policy agreed: 4 October 2026.

| Record category | Retention period | Trigger and required action |
| --- | --- | --- |
| Successful club applications and directory details | For as long as the club consents to being included on the website | On receipt of notice withdrawing consent or requesting removal, take the listing down within 48 hours. Stop retaining club details for directory inclusion when consent is withdrawn. |
| Unsuccessful applications and associated personal data | During a 48-hour notice period before deletion | Notify the club of the amendments required for inclusion and the deletion deadline. Allow 48 hours from sending the notice to make those amendments. If the requirements are not met by the deadline, delete the application information and associated personal data from Netlify Forms and the mailbox. Applications that qualify follow the successful-club retention schedule. |
| General enquiries | To be confirmed | Do not treat the club listing policy as a retention period for unrelated enquiries. |
| Hosting logs, provider backups and other provider records | To be confirmed against provider settings and agreements | Website removal is not a guarantee of immediate erasure from providers or third-party caches. |

## Receiving and actioning a removal notice

1. Accept notices at contact.0161active@gmail.com. Record when the notice was received and the resulting 48-hour deadline; do not start the clock when the message is first read.
2. Match the club and listing. If the request is ambiguous, seek clarification promptly and record what is needed. Do not collect more identity information than necessary.
3. Remove the club from data/clubs.json and remove its public profile page and generated share image. Remove any separate homepage/map records or photographs for that listing, including entries in js/clubdata.js where applicable. Remove associated successful application copies held for directory inclusion.
4. Regenerate profiles, navigation data as applicable, social metadata and the sitemap, deploy, and confirm that the listing is no longer publicly served within the deadline. Deleting a local file alone does not remove a live listing.
5. Check Netlify submissions, email attachments and other maintained copies. Confirm removal to the club and keep any minimal administrative audit record subject to a separately agreed retention period.

The site does not currently automate receipt monitoring, listing removal or application deletion. Search engines, social platforms and user browsers may retain copies beyond website removal.

## Consent records

Record when, how and for which details the club consented to inclusion. A public-source check is not evidence of consent. The registration form and existing researched listings still need a separate consent review before the privacy policy is finalised. Do not relabel existing researched records as consented without evidence.

## Unsuccessful application notice

Send the club a notice explaining the required amendments and the deletion deadline. Record when the notice was sent; the 48-hour period starts at that point, not at an earlier last contact. Review amendments received during the notice period before making the final decision. If the club meets the listing requirements, apply the successful-club schedule. Otherwise, delete its application information and associated personal data when the notice period ends, including maintained copies, attachments and deleted-item folders. Provider backup retention remains subject to confirmed provider arrangements.
