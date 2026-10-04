# Email updates: free manual newsletter

The selected setup is Buttondown’s free plan, using the owner’s existing Gmail
account. Readers subscribe through the website bell; the editor sends newsletters
manually from Buttondown. Publishing an article does not send an email.
No paid RSS-to-email or automation add-on should be enabled for this setup.

## Connect the free account

1. Register at https://buttondown.com/register using `yanngrechez@gmail.com`.
   Use Deadline Journal as the newsletter name and choose an available username.
   Verify the account email. No separate journal mailbox is required.
2. Keep Buttondown’s default sending address (`USERNAME@buttondown.email`).
   Replies are forwarded through Buttondown to the account’s email address.
   No custom-domain DNS changes are needed.
3. Leave double opt-in enabled. Readers must confirm their own subscriptions.
4. Enter the newsletter username under Pages CMS → **Email signup settings**.
   Keep the public bell disabled while testing.
5. Test the connected signup privately: verify the confirmation email, a sample
   newsletter sent only to the owner’s test address, and unsubscribe.
6. After delivery is verified, mark the verification checkbox and enable the bell
   in Pages CMS. Cloudflare publishes the change.

The verified account username is `deadlinejournal`; it is saved in the website
configuration. Public signup remains disabled pending delivery verification.
No newsletter account or paid plan has been created by this code.

## Send an article update or announcement

1. Publish articles in Pages CMS as usual.
2. Open Buttondown and compose a newsletter with a subject, a short introduction,
   and links to the articles. You can include several articles in one email.
3. Preview it and send a test to yourself.
4. Send it to confirmed subscribers when ready. Buttondown supplies unsubscribe
   controls and manages the subscriber list.

For editions or general announcements, use the same Buttondown editor.
The free plan currently covers the first 100 active subscribers. Published
pricing assumes at most one email per day to the full list. Recheck the plan
before exceeding either allowance; no paid upgrade is authorized automatically.

Suggested article email:

> Subject: New from Deadline Journal: [article title]
>
> [One or two sentences introducing the article.]
>
> [Read the article](https://deadlinejournal.org/ARTICLE-SLUG)
>
> Deadline Journal

The signup interface supports the journal’s six languages. Newsletter text is
written manually in Buttondown; changing the website language does not select
an email language or translate outgoing newsletters.

## Website integration

The HTML form uses Buttondown’s normal POST endpoint so the provider can handle
verification and CAPTCHA. It never claims success before the provider accepts
it. No email address is sent to PostHog or stored in localStorage, and no API key
is exposed to the browser.

The existing `/feed.xml` remains available to RSS readers. The **Publication
announcements (RSS)** CMS collection adds messages to that public feed only.
It does not send email with the selected free setup. Use Buttondown to send mail.
Draft, placeholder and future-dated content stays out of the feed; article and
announcement IDs remain stable across edits. Future publication dates require
a site rebuild when due. This is not scheduled publishing.

Signup remains hidden until a real username and delivery verification are set.
The local preview cannot save or send email addresses. Run
`node --test tests/newsletter.test.cjs` to check feed and activation behavior.

Documentation:
- https://buttondown.com/register
- https://buttondown.com/pricing
- https://docs.buttondown.com/welcome-to-buttondown
- https://docs.buttondown.com/replies
- https://docs.buttondown.com/building-your-subscriber-base
- https://docs.buttondown.com/double-opt-in
