# infi-Eureka — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-08-21
**Status:** Draft — awaiting sign-off on the open decisions in §11
**Owner:** partnerships@i3w.ai

---

## 1. Summary

infi-Eureka is an exam-prep platform for Indian students preparing for **NEET** (the national medical entrance exam). A student signs up, pays **once**, and permanently unlocks three things:

1. **One-shot videos** — long-form, full-chapter revision lectures.
2. **Notes & highlights** — readable chapter notes where the student's own highlights are saved and come back on every visit.
3. **CBT mock tests** — computer-based tests that copy the real NEET exam interface, scored by the server.

There is no subscription, no per-course purchase, and no free tier beyond the account itself. One price, everything opens, forever.

The v1 launch audience is the students of a partner coaching institute — roughly **350 users** (see §3). The deal is worth roughly **₹12 lakh** in revenue (~350 students × ₹3,499).

---

## 2. The problem

A NEET aspirant today juggles four or five disconnected things: a YouTube playlist for lectures, a PDF folder for notes, a separate mock-test site, and a notebook for what they highlighted. Nothing remembers them. Nothing is in one place.

The paid alternatives solve this but charge subscription fees that renew every month or lock each subject behind its own purchase. For a student whose family is paying, a recurring bill and a confusing catalogue are both real friction.

**What we are betting on:** students will pay a single, clearly discounted, one-time price for one place that has everything and remembers their work.

---

## 3. Who it is for

| | |
|---|---|
| **Launch cohort** | Students of a coaching institute — roughly **350 users** at launch. This is the known, committed audience v1 is built and sized for; open signups beyond the institute can follow later. The deal is expected to bring in roughly **₹12 lakh** (~350 × ₹3,499). |
| **Primary user** | A Class 11/12 or repeat-year NEET aspirant, age 16–20, in India. Studies mostly on a laptop; browses on a phone. Price-sensitive; the payment decision usually involves a parent. |
| **Payer** | Often a parent, paying by UPI. They need the price to be obvious and the transaction to be finished in under a minute. |
| **Content admin (internal)** | Us, for v1. Uploads videos, writes notes, loads question banks. Not a customer-facing role yet. |

Because the launch audience is ~350 coaching students, v1 does not need to be engineered for large scale: a single server and a single PostgreSQL instance are enough, and marketing/SEO work is out of scope until we open up beyond the institute.

---

## 4. Goals and non-goals

### Goals

- **G1** — A student can go from landing on the site to fully unlocked in under three minutes.
- **G2** — A paid student never sees a paywall again. Access is permanent and needs no renewal.
- **G3** — The mock test feels close enough to the real NEET CBT interface that exam day holds no surprises.
- **G4** — Notes remember the student. Highlights persist across sessions and devices.
- **G5** — Nothing about payment, access, or scoring can be faked from the browser.

### Non-goals for v1

- No subscriptions, renewals, or tiered plans.
- No refunds flow in the product (handled manually over support if needed).
- No live classes, doubt-solving, chat, or teacher interaction.
- No mobile app. Web only, responsive.
- No student-uploaded content.
- No leaderboards, streaks, or social features.

---

## 5. The core product decision

> **One payment unlocks everything, permanently.**

Everything else follows from this. Three consequences worth stating plainly:

1. **The dashboard shows the locked content, it does not hide it.** A locked student sees every video title, every note, every mock test — greyed out. Hiding the catalogue removes the reason to pay. Showing it *is* the sales pitch.
2. **There is exactly one purchase decision in the whole product.** No upsells, no add-ons. The student decides once.
3. **Access is a property of the user, not of a session or a plan period.** Once `is_premium` is true, it stays true. There is no expiry to check, nothing to renew, no billing cycle.

---

## 6. User journeys

### 6.1 New student → paid

1. Lands on the site, sees what is on offer.
2. Signs up with name, email, password.
3. Lands on the dashboard. Sees videos, notes and tests — all locked. A single button reads **"Unlock everything — ~~₹6,000~~ ₹3,499"**.
4. Clicks it. Razorpay's checkout opens over the page. Pays by UPI, card or netbanking.
5. Payment succeeds. The page confirms, the locks disappear, the dashboard is now fully usable.
6. Never sees a paywall again on any device they log into.

### 6.2 Returning paid student

1. Logs in.
2. Dashboard opens with everything available.
3. Picks a video, a note, or a mock test and gets straight to work.

### 6.3 Taking a mock test

1. Opens a test, sees title, duration, question count and total marks.
2. Clicks Start. The timer begins on the **server**; the on-screen countdown mirrors it.
3. Answers questions. Can jump around using a question palette, and mark questions for review.
4. Every answer saves as they go, so a refresh or a dropped connection loses nothing.
5. Submits — or the server auto-submits when time is up.
6. The server scores it. The results screen shows the score, correct/wrong/unattempted counts, and a per-question breakdown with the correct answers **now** revealed.

### 6.4 Reading notes with highlights

1. Opens a chapter note.
2. Selects a passage; it highlights and saves automatically.
3. Closes the tab. Comes back a week later on a different machine. The highlights are exactly where they left them.

### 6.5 Payment interrupted

1. Student pays on their phone, then the browser tab closes or the network drops before the confirmation lands.
2. Razorpay's webhook reaches our server independently and marks them premium anyway.
3. Next login, they are unlocked. They never contact support.

---

## 7. Feature requirements

Priority: **P0** = must ship in v1. **P1** = wanted, can follow.

### 7.1 Accounts

| ID | Requirement | Priority |
|---|---|---|
| PR-A1 | Sign up with name, email and password. | P0 |
| PR-A2 | Log in with email and password. | P0 |
| PR-A3 | Stay logged in across browser restarts. | P0 |
| PR-A4 | Any page needing an account redirects a logged-out visitor to login. | P0 |
| PR-A5 | Log out. | P0 |
| PR-A6 | Forgot-password / reset by email. | P1 |

### 7.2 Payment and unlocking

| ID | Requirement | Priority |
|---|---|---|
| PR-P1 | Locked students see all content titles, greyed out, with a single unlock button. | P0 |
| PR-P2 | The button shows the struck-through MRP ₹6,000 and the live price ₹3,499. | P0 |
| PR-P3 | Pay by UPI, card or netbanking through Razorpay. | P0 |
| PR-P4 | On success, the whole product unlocks without needing a re-login. | P0 |
| PR-P5 | An interrupted payment still unlocks the student, via webhook. | P0 |
| PR-P6 | The price can be changed by us without a code deploy. | P0 |
| PR-P7 | A student who is already premium is never charged again — the unlock button is gone. | P0 |
| PR-P8 | Payment receipt emailed to the student. | P1 |

### 7.3 One-shot videos

| ID | Requirement | Priority |
|---|---|---|
| PR-V1 | Browse videos, filtered by subject (Physics, Chemistry, Biology). | P0 |
| PR-V2 | Each video shows title, chapter, thumbnail and duration. | P0 |
| PR-V3 | Play a video with working seek, pause and volume. | P0 |
| PR-V4 | Playback works on desktop and mobile browsers. | P0 |
| PR-V5 | Resume from where the student stopped watching. | P1 |
| PR-V6 | Playback speed control. | P1 |

### 7.4 Notes and highlights

| ID | Requirement | Priority |
|---|---|---|
| PR-N1 | Browse notes by subject and chapter. | P0 |
| PR-N2 | Read a note comfortably on desktop and mobile. | P0 |
| PR-N3 | Select text to create a highlight; it saves without a save button. | P0 |
| PR-N4 | Highlights reappear on reopening the note, on any device. | P0 |
| PR-N5 | Remove a highlight. | P0 |
| PR-N6 | One student's highlights are never visible to another. | P0 |
| PR-N7 | Personal typed notes attached to a highlight. | P1 |
| PR-N8 | Download a note as PDF. | P1 |

### 7.5 CBT mock tests

| ID | Requirement | Priority |
|---|---|---|
| PR-T1 | Browse available tests with duration, question count and total marks. | P0 |
| PR-T2 | Start a test; a countdown timer runs. | P0 |
| PR-T3 | Question palette showing answered / unanswered / marked-for-review at a glance. | P0 |
| PR-T4 | Jump to any question in any order. | P0 |
| PR-T5 | Mark a question for review and come back to it. | P0 |
| PR-T6 | Answers save as the student goes; a refresh loses nothing. | P0 |
| PR-T7 | Submit manually, or auto-submit when the timer expires. | P0 |
| PR-T8 | NEET marking: +4 correct, −1 wrong, 0 unattempted. | P0 |
| PR-T9 | Results screen: total score, correct/wrong/unattempted, per-question review with correct answers. | P0 |
| PR-T10 | Correct answers are never available to the browser during the test. | P0 |
| PR-T11 | History of all past attempts. | P1 |
| PR-T12 | Subject-wise score breakdown and time-per-question. | P1 |

### 7.6 Analytics

| ID | Requirement | Priority |
|---|---|---|
| PR-G1 | Page views tracked on every route. | P0 |
| PR-G2 | Events tracked: signup completed, login, video played, note opened, test started, test submitted, checkout opened, payment completed. | P0 |
| PR-G3 | The funnel *landing → signup → checkout opened → payment completed* is readable in GA4. | P0 |

---

## 8. Pricing

| | |
|---|---|
| MRP (shown struck through) | **₹6,000** |
| Selling price | **₹3,499** |
| Discount shown | ~42% off |
| Billing | One time. No renewal. |
| Currency | INR only |
| Methods | UPI, cards, netbanking (whatever Razorpay offers) |
| Expected v1 revenue | ~**₹12 lakh** from the coaching cohort (~350 students × ₹3,499) |

Both numbers live in the database, not in code, so the discount can be changed for a campaign without a deploy. The server is the only thing allowed to decide the amount.

---

## 9. Success metrics

| Metric | What it tells us | Target for v1 |
|---|---|---|
| Signup → payment conversion | Is the offer working? | ≥ 5% |
| Time from signup to payment | Is the funnel smooth? | median under 10 min |
| Payment success rate | Is checkout broken? | ≥ 90% of started checkouts |
| Payments rescued by webhook | Is the backup path earning its keep? | tracked, no target |
| Paid students active in week 1 | Did they get value, or just buy? | ≥ 60% |
| Mock tests completed per paid student, month 1 | The stickiest feature | ≥ 3 |
| Test abandonment rate | Is the test UI failing them? | ≤ 20% |

---

## 10. Out of scope for v1

Written down so it does not creep in: subscriptions or renewals; multiple plans; coupon codes; referrals; refunds inside the product; free trials or sample content; live classes; doubt-solving or chat; teacher accounts; a public admin panel; a mobile app; offline downloads; JEE or any exam other than NEET; regional languages; leaderboards, ranks or peer comparison; email marketing.

---

## 11. Open decisions

These block the phases named. Everything else can proceed.

| # | Decision | Working assumption | Blocks |
|---|---|---|---|
| 1 | Notes format — rich text stored by us, or uploaded PDFs? | **Rich text (HTML).** Highlighting a PDF is a different and much harder problem; the plan's `highlighted_text + position` model only works on text. | Phase 4 |
| 2 | Who loads content — an admin panel, or us seeding the database? | **Database seeding for v1.** An admin panel is a whole product of its own; it can come after launch. | Phases 3, 4, 5 |
| 3 | Razorpay account and API keys | Needed from you. Create at razorpay.com. Test keys are enough to build with. | Phase 6 |
| 4 | GA4 Measurement ID | Needed from you. Create at analytics.google.com. | Phase 7 |
| 5 | How much content at launch? | Unknown. Affects how long seeding takes, not how anything is built. | Launch date |

---

## 12. Related documents

- `docs/PLAN.md` — the original build plan and phase order
- `docs/SRS.md` — numbered, testable requirements
- `docs/ARCHITECTURE.md` — how the system is put together and why
- `docs/DEVELOPMENT.md` — how to set up and work on it
