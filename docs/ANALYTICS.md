# Analytics — tracking the student journey

**Goal:** see the whole path a student takes, from the ad they clicked to the
mock test they submitted three weeks later.
**Status:** the plumbing is built; it is switched off, anonymous, and missing
the events that matter most.
**Date:** 2026-09-09

## The three questions actually being asked

> How many free users? How many convert to paid? How much time do they spend?

**Two of those three do not need Google Analytics at all.** Our own database
already knows exactly who signed up and exactly who paid — it is the system
that took the money. A `SELECT` answers both, today, with no tracking code, no
waiting, and no sampling. Run against production on 2026-09-09:

| | |
|---|---|
| Total users | 7 |
| Paid users | 2 |
| Free users | 5 |
| Conversion | 28.6% |

(Pre-launch numbers — real students have not arrived yet, so read the shape,
not the percentage.)

GA4 would answer the same question *worse*: it samples, it lags by up to a
day, and roughly a fifth of students run an ad blocker that stops it
reporting at all. Never take a revenue number from analytics when the database
is sitting right there.

So the honest split is:

- **Free vs paid, conversion, revenue, test scores** → our database. Build a
  small admin figures page or just keep a saved query. Exact, live, free.
- **Time spent, where students drop out, what they did before signing up**
  → GA4. Our database cannot see any of it, because none of it touches the
  server.

The rest of this document is about the second half, because the first half is
already sitting in Postgres waiting to be asked.

### Time spent — the one that genuinely needs GA4

GA4 measures this on its own once it is switched on: *engagement time* per
page, per session, per user. No events to write. Turning it on (Step 1 below)
is the entire task.

Our database can only see time in coarse strokes — a test attempt's start and
end, for instance. It has no idea how long a student stared at a note, because
reading a note sends the server nothing.

## What "the whole journey" needs

Three separate things, and only the first one is in place:

1. **Where they went.** Every route change is already reported. This is done.
2. **Who they are, across visits.** Today every session is a stranger. A
   student who signs up on their phone and pays on a laptop is two unrelated
   people in our reports. Fixing this is one line of code and it is the single
   biggest win in this document.
3. **What they did that was not a page change.** Hitting the paywall, opening
   the payment sheet, answering a question, giving up halfway. Most of these
   have no event today, and they are the parts of the journey the PM is asking
   about.

## One limit worth knowing up front

GA4 answers *"of a thousand students, where did they drop out?"* It does not
answer *"show me exactly what this one student did on Tuesday."* It is a
funnel tool, it samples large reports, and events can take a day to appear.

If the PM wants to replay one person's session, GA4 is the wrong tool and we
should talk about that separately before anyone builds a report on the wrong
expectation.

## What already works

| Piece | Where | State |
|---|---|---|
| Loads gtag.js, configures GA4 | `frontend/src/analytics/ga.ts:21` | Done |
| Page view on every route change | `frontend/src/App.tsx:30` | Done |
| `sign_up` | `frontend/src/pages/SignupPage.tsx:278` | Done |
| `login` | `frontend/src/pages/LoginPage.tsx:132` | Done |
| `video_played` | `frontend/src/pages/VideoPlayerPage.tsx:69` | Done |
| `test_submitted` | `frontend/src/pages/ResultsPage.tsx:50` | Done |

Automatic page views are deliberately off (`send_page_view: false`) because
this is a single-page app: GA would count the first load and then never notice
a student moving around. `App.tsx` reports each route itself, which is the only
way the numbers come out right.

Everything else below is missing.

---

## Step 1 — switch it on (nothing works until this is done)

No measurement ID is configured, so every function in `ga.ts` returns early
and does nothing. There is a trap in fixing it.

`VITE_GA4_MEASUREMENT_ID` is a **build-time** variable. Vite does not read
environment variables when the app runs in a student's browser — it pastes
their values into the JavaScript when the bundle is compiled. By the time the
container starts, the value is already baked in or already missing.

That matters because our runtime configuration lives in `env.yaml`, which
Cloud Run injects at container start — far too late. **Putting the ID in
`env.yaml` will not work.** It has to reach the image build.

The Dockerfile is ready for it (`ARG VITE_GA4_MEASUREMENT_ID=""`, line 17,
passed to the build on line 20). Nothing supplies it, because `just deploy`
runs `gcloud builds submit --tag`, which cannot pass build arguments, so the
ARG falls back to empty.

**To do:**

1. Create the GA4 property, copy its measurement ID (`G-XXXXXXXXXX`).
2. Create a **second** property for development and put that one in
   `frontend/.env`. Never point local work at the production property — test
   clicks become real numbers the PM then reports on.
3. Add a small `cloudbuild.yaml` with a `docker build --build-arg` step and
   switch `just deploy` from `--tag` to `--config`. This is the only real
   engineering in the whole document.
4. Deploy, open the site, watch a page view land in GA4 Realtime. Stop here if
   it does not arrive.

## Step 2 — give the journey a person (the big one)

Right now the journey breaks every time a student closes the browser. GA4 has
a built-in answer: set `user_id` and it stitches every session, on every
device, into one path.

Send our internal UUID (`user.id` from `useAuth`) — never the name, phone, or
email. A UUID means nothing to Google and everything to us: we can look up who
it is in our own database, which is exactly the line the SRS draws (FR-G-04).

Set it wherever auth state settles, right after login, signup, and the session
restore on page load. One call:

```
gtag('config', MEASUREMENT_ID, { user_id: user.id })
```

Without this, every funnel below is measured on strangers and any question
containing the word "then" — *did the students who watched videos then pay?* —
cannot be answered at all.

## Step 3 — the events the journey is missing

Grouped by stage. The ones marked **key** are the ones that answer the PM's
question; the rest are useful once those are in.

**Arriving** — nothing to build. GA4 records the source, campaign, and landing
page automatically.

**Signing up**

| Event | Fire when | Why |
|---|---|---|
| `signup_started` | The signup form is first touched | Gives a denominator — how many *begin* versus finish |
| `otp_sent` | The code goes out | Splits "gave up on the form" from "never got the SMS" |
| `otp_failed` | A wrong code is entered | A spike here is a broken SMS provider, not disinterest |
| `sign_up` | Done | Already wired |

**Exploring** — page views cover which sections they browse. Add:

| Event | Fire when | Why |
|---|---|---|
| `content_opened` | Any video, note, or document opens | One event with a `type` beats four near-identical ones |
| `video_progress` | 25 / 50 / 75 / 100% watched | "Played" and "watched" are very different signals |

**Hitting the paywall — key**

| Event | Fire when | Why |
|---|---|---|
| `paywall_hit` | Locked content is clicked | **The most important missing event.** It is the exact moment a student wants something and cannot have it |

Send what they were reaching for (`content_id`, `type`). That turns the paywall
from one number into a ranked list of what students will actually pay for.

**Paying — key**

| Event | Fire when | Where |
|---|---|---|
| `checkout_opened` | The Razorpay sheet opens | `frontend/src/hooks/usePayment.ts:109` |
| `payment_completed` | **Our server** confirms it | `frontend/src/hooks/usePayment.ts` |
| `payment_failed` | Razorpay reports a failure | same |
| `payment_abandoned` | The sheet is closed without paying | same |

Fire `payment_completed` on our server's confirmation, not Razorpay's
callback: a student can close the sheet at the moment of truth and leave the
two disagreeing. Revenue reported from the wrong signal is worse than no
revenue reported at all.

**Testing**

| Event | Fire when | Why |
|---|---|---|
| `test_started` | The attempt loads | Fire once, not on resume — see below |
| `test_abandoned` | An attempt expires unsubmitted | Distinguishes "found it hard" from "never tried" |
| `test_submitted` | Done | Already wired |

`startAttempt` returns the attempt already in progress when a student comes
back to an unfinished paper, so firing `test_started` on every load would count
one attempt several times and make the drop-off look far worse than it is.

## What this then shows

With Steps 1–3 done, GA4 can draw the path end to end:

```
ad / search
   → landing page
      → signup_started → otp_sent → sign_up
         → dashboard
            → content_opened (free) → video_progress
               → paywall_hit          ← where wanting begins
                  → checkout_opened
                     → payment_completed
                        → test_started → test_submitted
                           → comes back next week
```

And it answers the questions we cannot touch today:

- **Where exactly do we lose people?** Every arrow above becomes a percentage.
- **What do students want when they hit the wall?** `paywall_hit` carries the
  content id, so the answer is a ranked list, not a guess.
- **Does free content sell the paid product?** Compare `paywall_hit` rates
  between students who watched videos and students who did not. This is the
  question that decides what we build next, and it needs `user_id` to be
  answerable at all.
- **Do payers come back?** GA4's retention reports do this for free once
  `user_id` is set.

Build these as funnel explorations in GA4. No code — it is report
configuration, and the PM can do it themselves once the events land.

## Rules

**Never send a name, phone number, or email** (FR-G-04). Ids and titles are
fine. Personal data in GA4 puts it in a system we do not control and is
grounds for Google suspending the property.

**Never rename an event.** GA4 history does not follow a rename — the old name
stops and the new one starts from zero.

**Add events in `ga.ts`, never call `gtag` from a page.** One file holds every
name. That is what keeps them consistent and makes changing vendors a
single-file job.

## Order of work

1. GA4 property + measurement ID. *(no code)*
2. `cloudbuild.yaml` + `just deploy` passing the build arg. *(the real task)*
3. Confirm a page view in Realtime. *(stop if it does not arrive)*
4. `user_id` on login, signup, and session restore. *(one line, biggest payoff)*
5. `paywall_hit` and the four payment events. *(the funnel the PM asked for)*
6. The signup, content, and test events.
7. Funnel explorations in GA4.

Steps 1–5 are worth shipping on their own. Steps 6–7 refine a picture that is
already useful.

**Before any of it:** the free/paid/conversion numbers need none of this work.
They are one query against our own database and can go on a dashboard this
week. Do that first — it is the question being asked most often and the
cheapest one to answer.
