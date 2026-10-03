# Email updates: activation and publishing

The website includes a compact bell signup, an RSS publication feed, and an
**Email announcements** collection in Pages CMS. Signup starts disabled; no
addresses are collected until the newsletter account is connected and verified.
The dark-mode concept remains separate and unpublished.

## Connect the email service

The prepared form supports Buttondown. Other providers can also consume the
standard RSS feed; their signup endpoint must be adapted before enabling the bell.
No newsletter account, paid plan, domain email address or sending automation is
created by the code alone.

1. Create the journal's newsletter account. Use the display name Deadline Journal.
   Choose a newsletter username and verify the account email.
2. Configure a sender, ideally `updates@deadlinejournal.org`, using the DNS records
   provided by the service. An inbox such as `hello@deadlinejournal.org` can forward
   incoming messages to your Gmail. Don't replace existing mail DNS blindly.
3. Leave double opt-in enabled. Subscribers must confirm their own address.
   Buttondown handles confirmation, CAPTCHA, unsubscribe, bounces and suppression.
4. Configure RSS-to-email using `https://deadlinejournal.org/feed.xml`.
   Choose **every time**, and start in **create draft** mode for the first test.
   Buttondown polls approximately every 30 minutes; it is not instantaneous.
5. Enable **skip old items** when first connecting so the existing archive is not
   emailed as a batch of new articles. Inspect the feed preview before sending.
6. Use the provider's test-send feature to deliver a sample only to the owner's
   test address. Verify signup confirmation, an article email, an edition or
   announcement email, and unsubscribe before changing to automatic sending.
7. In Pages CMS → **Email signup settings**, enter the username, confirm delivery
   has been tested, and enable the signup bell. Cloudflare publishes the change.

The HTML form uses Buttondown's normal POST endpoint; it does not fake success or
use fetch to bypass provider challenges. Subscribers may complete verification
on Buttondown and then confirm by email. The browser never receives an API key.
No email address is sent to PostHog or stored in localStorage.

## Send updates

- **New articles:** publish in Pages CMS as usual. Published, non-placeholder
  articles with a valid, non-future publication date enter the feed automatically.
- **New editions or announcements:** create an entry under **Email announcements**,
  choose its type, write the message, add a journal link, set the current UTC
  publication time and switch from Draft to Published when ready to email it.
- **Manual emails:** use the newsletter provider's editor for messages that should
  not appear in the public feed.

Emails link back to the journal, and subscribers receive the English edition.
The translated website remains available at the destination. Separate newsletter
language preferences are not implemented.

Keep article slugs and announcement IDs stable after publication. Feed GUIDs use
these IDs so ordinary edits, cover changes and translation builds do not trigger
duplicate emails. Editing an already-sent announcement does not recall or resend
the email. Use a new announcement ID for a separate correction notice.

Publication dates are independent of update dates. Backdated items may be skipped
by the provider's old-item filter. Future-dated items remain out of the feed until
a build runs after that date; this is not a scheduled publishing service.

## Suggested RSS email template

Configure the provider to render its normal confirmation and unsubscribe footer.
Use an English subject such as `New from Deadline Journal` and this body:

```html
{% for item in items %}
<h2>{{ item.title }}</h2>
{{ item.content }}
{% endfor %}
```

Preview the rendered email in Buttondown before turning on automatic sending.
Do not send the same message both manually and through its RSS feed entry.

## Costs and credentials

Buttondown's published pricing lists free sending for the first 100 subscribers,
with RSS-to-email as a paid add-on. Confirm current pricing and sending-frequency
limits with the provider before purchasing or activation; automatic emails for
multiple posts per day may require a different allowance. No plan is purchased
by this integration. Public settings contain only the newsletter username.

Documentation:
- https://docs.buttondown.com/building-your-subscriber-base
- https://docs.buttondown.com/double-opt-in
- https://docs.buttondown.com/rss-to-email
- https://buttondown.com/pricing

## Preview and verification

`npm run build` generates `dist/feed.xml`. Normal production builds omit the bell
while disabled. The local notification preview injects the same signup markup
with a form that cannot save or transmit an email address. Its submit handler
explicitly reports preview mode rather than pretending a subscription succeeded.
Run `node --test tests/newsletter.test.cjs` for feed identity, escaping, exclusions
and activation checks, and run the full suite before deployment.
