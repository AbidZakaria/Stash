'use strict';
/* The Book: short lessons Echo can point you to. Written in our own words, based on the
   7 Baby Steps popularized by Dave Ramsey plus common budgeting guidelines.
   Markup: blank line = new paragraph, "- " = bullet, **bold**. */

const CHAPTERS = [
  { id: 'start', name: 'Start here', ico: '👋' },
  { id: 'steps', name: 'The 7 Baby Steps', ico: '🧭' },
  { id: 'budget', name: 'Budgeting', ico: '🗂️' },
  { id: 'debt', name: 'Getting out of debt', ico: '❄️' },
  { id: 'save', name: 'Saving and big buys', ico: '🏦' },
  { id: 'future', name: 'Investing and protecting', ico: '🌱' },
  { id: 'heart', name: 'Giving and mindset', ico: '🤲' },
  { id: 'guide', name: 'How much for what', ico: '📊' },
];

const BOOK = [
  // ----- start here -----
  { id: 'start', ch: 'start', title: 'How this book works', body: `
Echo isn't a chatbot. Everything it says comes from simple rules and the numbers you log on this phone. Nothing is sent anywhere.

This book explains the ideas behind Echo's Coach and Advisor modes. Most of it follows the **7 Baby Steps** popularized by Dave Ramsey, retold in our own words, plus common budgeting guidelines. PocketStash isn't connected to Ramsey Solutions.

It's general education, not advice for your exact situation. Some numbers are US figures; adapt them to where you live. For taxes, legal questions or big investments, talk to a qualified pro who teaches you instead of selling to you.

- **Hold Echo** to switch modes: Buddy (the classic Echo), Coach and Advisor.
- **Coach** finds your Baby Step and walks it with you.
- **Advisor** grades your month against healthy guidelines.`,
    links: [{ label: 'See the 7 steps', go: '/book/map' }] },

  { id: 'behavior', ch: 'start', title: 'Money is mostly behavior', body: `
Ramsey's best-known line is that personal finance is about **80% behavior and 20% head knowledge**. Almost everyone knows they should spend less than they make. Doing it every single month is the hard part.

That's why the Baby Steps come in a fixed order and you do **one at a time**. Spreading a little money across five goals feels responsible, but nothing ever gets finished. Pointing everything at one goal gets quick wins, and wins keep you going.

Ramsey calls the right attitude **gazelle intensity**: a gazelle chased by a cheetah doesn't stroll. Be that focused for a season, and it won't last forever.` },

  // ----- the 7 baby steps -----
  { id: 'map', ch: 'steps', title: 'The map', body: `
- **Step 1:** Save a starter emergency fund ($1,000 in the US).
- **Step 2:** Pay off all debt except the house, smallest balance first (the debt snowball).
- **Step 3:** Save 3 to 6 months of expenses.
- **Step 4:** Invest 15% of household income for retirement.
- **Step 5:** Save for your children's college.
- **Step 6:** Pay off your home early.
- **Step 7:** Build wealth and give.

Steps 1 to 3 get you stable. Steps 4, 5 and 6 run at the same time. Step 7 is where it pays off.

Do them in order. If life breaks (job loss, illness, a new baby), you pause. There's a lesson on that too.`,
    links: [{ label: 'Find my step', go: '/coach' }] },

  { id: 'bs1', ch: 'steps', title: 'Step 1: Starter emergency fund', body: `
**What:** save a small cushion as fast as you can. Ramsey's number is $1,000 in the US: enough for a flat tire, a broken phone or a doctor visit. Outside the US, pick what covers a typical surprise where you live. Echo suggests half to one month of pay.

**Why:** without a cushion, every small emergency becomes new debt, and you never get ahead.

**How:**
- Make an Emergency stash and move money into it on every payday.
- Pay only minimums on debts while you do this.
- Sell things you don't use, pick up extra hours, cut fun to almost zero.
- Aim to finish in about a month. Speed matters more than perfection.

Keep it separate from spending money so it doesn't quietly disappear.`,
    links: [{ label: 'Emergency fund calculator', go: '/tools' }] },

  { id: 'bs2', ch: 'steps', title: 'Step 2: The debt snowball', body: `
**What:** pay off every debt except your home: cards, car loans, student loans, phone plans, buy-now-pay-later, money owed to family.

**How the snowball works:**
- List debts from **smallest balance to largest**, whatever the interest rate.
- Pay the minimum on all of them.
- Throw every extra coin at the smallest one.
- When it's gone, add its payment to the next one. The payment grows like a rolling snowball.

**While you're here:** pause investing for now (Ramsey even pauses the employer match) so the cash goes to debt, and take on **no new debt**. Cut up the cards.

Echo's debt planner simulates your snowball month by month, interest included, and shows the date you'll be debt-free.`,
    links: [{ label: 'Open my snowball', go: '/debts' }] },

  { id: 'bs3', ch: 'steps', title: 'Step 3: Full emergency fund', body: `
**What:** save 3 to 6 months of normal expenses.

**3 months** usually fits a stable job, two incomes or few dependents. Go closer to **6 months** if you're self-employed, on commission, the only earner, have kids, or your job feels shaky.

**How:** you just freed up all your old debt payments. Point them, plus anything extra, at the Emergency stash.

**Where:** a plain savings account you can reach in a day or two. Not stocks, not crypto. This money's job is to be there, not to grow.

Once this is done, a job loss or a big repair is an inconvenience instead of a crisis.` },

  { id: 'bs4', ch: 'steps', title: 'Step 4: Invest 15% for retirement', body: `
**What:** put 15% of your gross (before-tax) household income into retirement investing.

**Why 15%:** it builds a serious nest egg while leaving room for Steps 5 and 6. More isn't wrong, but don't starve the other goals.

**How:**
- Take any employer match first.
- Then use tax-advantaged retirement accounts available where you live.
- Choose long-term, diversified funds. Don't invest in anything you can't explain.
- Ignore get-rich-quick schemes. Slow and boring wins.`,
    links: [{ label: 'Growth calculator', go: '/tools' }] },

  { id: 'bs5', ch: 'steps', title: "Step 5: Your kids' college", body: `
**What:** save for your children's education. In the US Ramsey points to education savings accounts and 529 plans. Elsewhere, look for local education savings options, or use a dedicated stash.

**Retirement comes first.** Kids can get scholarships for school, but nobody gives scholarships for retirement.

**Avoid student loans.** Combine savings with scholarships, grants, work while studying and an affordable school.

No kids? Skip straight past this one.` },

  { id: 'bs6', ch: 'steps', title: 'Step 6: Pay off your home early', body: `
**What:** after 15% to retirement and the college plan, every extra coin goes to the mortgage.

**Why:** imagine no house payment. Your income becomes yours to invest, give and enjoy.

**How:** extra payments go straight to the principal, which cuts both years and interest. Even a small extra amount every month adds up. Try it in the mortgage payoff calculator.

Renting or living with family? This step isn't for you yet. When you buy, use the house rules in "Saving and big buys".`,
    links: [{ label: 'Mortgage payoff calculator', go: '/tools' }] },

  { id: 'bs7', ch: 'steps', title: 'Step 7: Build wealth and give', body: `
You have no debt at all, a full emergency fund, and you're investing. Now keep building, enjoy life, leave an inheritance, and **give like crazy**.

Ramsey's motto sums up the whole journey: live like no one else now, so later you can live and give like no one else.` },

  { id: 'together', ch: 'steps', title: 'Steps 4, 5 and 6 together', body: `
Unlike the first three, Steps 4, 5 and 6 run at the same time:

- First, 15% of income to retirement (Step 4).
- Then, if you have kids, a set amount toward college (Step 5).
- Then **everything left over** goes to the house (Step 6).

The order sets priority, not timing.` },

  { id: 'crisis', ch: 'steps', title: 'When life hits: pause', body: `
Lost your job? Medical emergency? Baby on the way? **Pause the steps.**

- Stop extra debt payments. Keep paying minimums if you can.
- Pile up cash. It's your oxygen right now.
- Protect the **Four Walls** first: food, utilities, shelter and transportation.
- Take any honest income: gigs, deliveries, temporary work. Apply every day.
- Sell what you don't need.

If you can't pay everyone, call lenders **before** you miss a payment and ask about hardship plans. Never skip food or rent to pay a credit card. When things settle, pick the steps back up where you left off.`,
    links: [{ label: 'The Four Walls', go: '/book/four-walls' }] },

  // ----- budgeting -----
  { id: 'zero', ch: 'budget', title: 'The zero-based budget', body: `
**Income minus outgo equals zero.** Before the month starts, every coin you expect gets a job.

That doesn't mean spending it all. Saving and paying debt are jobs too. It means nothing is left wandering around with no purpose, because wandering money gets spent.

- Start with your take-home pay for the month.
- Giving and the Four Walls first, then the rest.
- Whatever is left goes to your current Baby Step.
- Make a new plan every month. December isn't July.

PocketStash's Plan shows "left to give a job" until you hit zero.`,
    links: [{ label: 'Open my plan', go: '/plan' }] },

  { id: 'four-walls', ch: 'budget', title: 'The Four Walls', body: `
When money is tight, cover these first, in this order:

- **Food:** groceries, not restaurants.
- **Utilities:** water, electricity, heating, basic phone.
- **Shelter:** rent or mortgage.
- **Transportation:** enough to get to work.

Basic clothing is close behind. After the Four Walls are safe, everything else gets what's left. A card company can wait; your family's dinner can't.` },

  { id: 'envelopes', ch: 'budget', title: 'Envelopes and stashes', body: `
Ramsey's classic trick is the cash **envelope system**: put cash for groceries, eating out or fun into envelopes on payday. When an envelope is empty, that category is done for the month.

Stashes in PocketStash work the same way. On payday, move money into a Groceries stash, a Fun stash, a Gifts stash. Spend from them. When one is empty, you'll see it, and Echo will too.` },

  { id: 'irregular', ch: 'budget', title: 'Budgeting an irregular income', body: `
Freelance, commission, tips, seasonal work? Plan on a **lean month**, the lowest you can reasonably expect.

- Write the budget for that lean amount: Four Walls first.
- Make a priority list for anything extra: the current Baby Step comes first, then the nice-to-haves.
- In a good month, work down the list. In a bad one, you're already covered.

Over time, a fuller emergency fund (closer to 6 months) smooths out the bumps.` },

  { id: 'sinking', ch: 'budget', title: "Sinking funds: emergencies that aren't", body: `
Car repairs, birthdays, holidays, school supplies, yearly insurance. These aren't surprises; you just don't know the exact day.

Divide each one by the months until it hits and save that much every month in its own stash. When the bill comes, the money is waiting and the emergency fund stays untouched.

Example: 1,200 for holidays in 8 months means 150 a month.`,
    links: [{ label: 'Save-for-a-goal calculator', go: '/tools' }] },

  { id: 'partner', ch: 'budget', title: 'Budgeting with a partner', body: `
Hold a short **budget meeting** before each month. Usually one of you is the "nerd" who loves numbers and the other is the "free spirit". Both get a vote, and the plan isn't final until both agree.

Pick a spending limit, say the price of a nice dinner, above which you check with each other first. No secret spending, no secret debt. Unity beats any spreadsheet.

Tip: each person can have their own account in PocketStash, or you can share one.` },

  { id: 'tracking', ch: 'budget', title: 'Track what actually happens', body: `
A plan is a guess. Tracking shows the truth. Log every spend, especially the small ones; coffees and snacks are where money quietly leaks.

PocketStash guesses a category from your reason ("Marjane" → groceries, "Uber" → transport) and learns from your corrections. Advisor mode then compares each category with healthy guidelines.` },

  // ----- debt -----
  { id: 'snow-vs-ava', ch: 'debt', title: 'Snowball or avalanche?', body: `
- **Snowball:** smallest balance first. You see debts disappear fast.
- **Avalanche:** highest interest first. Mathematically saves a bit more interest.

Ramsey teaches the snowball because getting out of debt is mostly a **behavior** problem. Quick wins keep people going, and people who keep going finish. If the avalanche keeps you more motivated, it works too.

What doesn't work: spreading extra money evenly across everything. Pick a target and attack.` },

  { id: 'cards', ch: 'debt', title: 'Cards and buy-now-pay-later', body: `
Ramsey teaches living without credit cards: use a debit card and cash. Studies of shoppers suggest people spend more when paying with a card than with cash, because it doesn't feel like real money.

**Buy-now-pay-later** works the same way. Splitting a purchase into four payments makes it feel cheaper. It isn't; it's debt with a friendly face.

Rewards points rarely make up for the extra spending they encourage.` },

  { id: 'cars', ch: 'debt', title: 'Cars', body: `
Car payments keep people broke for life. Ramsey's guidelines:

- Don't borrow for a car. Buy a reliable used car with cash.
- The **total value of everything with a motor** (cars, motorbikes, boats) should be **less than half your yearly income**.
- Keep paying a "car payment", but into a car stash. In a couple of years you can upgrade with cash.

A new car loses a big chunk of its value in the first few years. Let someone else pay for that.`,
    links: [{ label: 'Car check', go: '/tools' }] },

  { id: 'extra', ch: 'debt', title: 'Finding extra money', body: `
The snowball only rolls as fast as you feed it.

- **Sell stuff.** Ramsey jokes you should sell so much the kids think they're next. The Items feature tracks what you're flipping.
- **Work more** for a season: extra shifts, deliveries, tutoring, freelance.
- **Cut hard:** subscriptions, eating out, impulse buys. "Rice and beans, beans and rice" is the Ramsey version.
- **Ask:** call your phone, internet and insurance providers for a better price.

It's temporary. Intensity now buys freedom later.` },

  { id: 'behind', ch: 'debt', title: "When you can't pay everyone", body: `
- Cover the **Four Walls** first. Always.
- List what's left after them and split it fairly between lenders. Ramsey calls this a **pro rata** plan.
- Call or write to each lender **before** you miss a payment, explain, and send what you can. Keep records.
- Don't give collectors direct access to your bank account.
- Don't take a new loan to pay an old one.
- Be careful with debt-settlement companies; many charge big fees.

Rules about debt collection differ by country. If it gets serious, find a reputable non-profit debt counselor.` },

  // ----- saving and big buys -----
  { id: 'ef-where', ch: 'save', title: 'Where the emergency fund lives', body: `
- **Separate** from your everyday money, so you don't spend it by accident.
- **Easy to reach** within a day or two: a plain savings account.
- **Not invested.** Markets drop exactly when jobs disappear.
- Not all as cash at home, where it can be lost or stolen.

An Emergency stash in PocketStash helps you see it and leave it alone.` },

  { id: 'what-emergency', ch: 'save', title: 'What counts as an emergency?', body: `
Ask three questions. Is it **unexpected**? Is it **necessary**? Is it **urgent**?

- Car broke down and you need it for work: yes.
- Medical bill: yes.
- Big sale on a TV: no.
- A friend's wedding trip: no. That's a sinking fund.

After you use it, refill it before going back to the next step.` },

  { id: 'house', ch: 'save', title: 'Buying a home', body: `
Ramsey's house rules:

- Be **out of debt with a full emergency fund** first (Steps 1 to 3).
- Keep the monthly payment, **including taxes and insurance, at or below 25% of take-home pay**.
- Use a **15-year fixed-rate** loan if you borrow.
- Put down at least **10%**, ideally **20%**, which avoids extra mortgage insurance in many countries.

Renting while you get ready isn't throwing money away; it's paying for flexibility.`,
    links: [{ label: 'How much house?', go: '/tools' }] },

  { id: 'cash-buys', ch: 'save', title: 'Paying cash for big things', body: `
Want a phone, a laptop, furniture, a trip? Make a stash, give it a goal, and save until it's full. The progress bar shows how close you are.

Waiting has a bonus: by the time you can pay, half the time you don't want it anymore. When you still do, you'll enjoy it without a payment following you around.` },

  // ----- investing and protecting -----
  { id: 'compound', ch: 'future', title: 'Compound growth', body: `
Money that earns returns, whose returns earn returns, grows faster every year.

Example: 300 a month for 30 years at 7% a year turns into about **366,000**. You only put in 108,000; growth did the rest.

The secret ingredient is **time**. Starting ten years earlier often beats saving twice as much later.`,
    links: [{ label: 'Try the growth calculator', go: '/tools' }] },

  { id: 'invest', ch: 'future', title: 'Investing basics', body: `
- **Long-term:** money you won't need for at least 5 years.
- **Diversified:** many companies, not one hot stock.
- **Understandable:** if you can't explain it, don't buy it.
- **Low drama:** don't try to time the market and don't panic-sell in a drop.
- **No get-rich-quick:** if it promises fast, easy money, walk away.

Ramsey favors simple, diversified mutual funds and a pro who teaches you rather than pressures you. Rules and products differ by country; learn yours.` },

  { id: 'insurance', ch: 'future', title: 'Insurance that matters', body: `
Insurance moves risks you can't afford to someone else. The essentials Ramsey stresses:

- **Health** coverage.
- **Car** and **home or renters** insurance.
- **Term life**, about 10 to 12 times your yearly income, if anyone depends on you.
- **Long-term disability** cover if you can get it.

He warns against using whole-life or "cash value" policies as an investment. And write a **will**, especially if you have kids.` },

  // ----- giving and mindset -----
  { id: 'giving', ch: 'heart', title: 'Giving', body: `
Ramsey recommends giving **10% of your income**, even while you work the early steps. Many traditions share the idea: tithing, zakat, sadaqa, or simply helping family and neighbors.

Generous people tend to be happier, and they hold their money more loosely. Plan your giving in the budget so it comes first, not from what's left, and never from borrowed money.` },

  { id: 'content', ch: 'heart', title: 'Contentment and comparison', body: `
The neighbors with the new car and the big trip? Many of them are carrying the debt to prove it.

Social media shows highlight reels, not bank statements. Comparison is the fastest way to feel poor while earning plenty.

Contentment isn't giving up on goals. It's being grateful for what you have while you build. It also makes every Baby Step easier.` },

  { id: 'live-like', ch: 'heart', title: 'Live like no one else', body: `
Ramsey's motto: **live like no one else now, so later you can live and give like no one else.**

It means a season of sacrifice that most people won't choose: no new car, fewer restaurants, extra work. Friends may think you're strange. Then, years later, you're the one with no payments, options and money to give.

It's a season, not a sentence. Pick the step, attack it, celebrate, move on.` },

  // ----- how much for what -----
  { id: 'guidelines', ch: 'guide', title: 'How much for what', body: `
Healthy shares of **take-home pay**:

- **Housing:** up to 25% (Ramsey's rule, including taxes and insurance).
- **Giving:** 10% (Ramsey).
- **Saving:** 10–15%, more when you can. The 50/30/20 rule says 20%.
- **Groceries:** 10–15%. **Eating out:** under 5%.
- **Utilities and bills:** 5–10%.
- **Transport:** 5–15%.
- **Health:** 5–10%. **Insurance:** 5–10%.
- **Personal:** 5–10%. **Fun:** 5–10% (nearly 0 during Steps 1–2).
- **Everything else:** about 5% (Ramsey's miscellaneous line).

Apart from Ramsey's housing, giving and miscellaneous lines, these are common planner guidelines. They aren't laws: if housing runs high where you live, something else has to run lower.

**50/30/20** is a quick sanity check: about 50% to needs, 30% to wants, 20% to saving and extra debt payments.`,
    links: [{ label: 'Run my check-up', go: '/checkup' }] },

  { id: 'doing-well', ch: 'guide', title: 'What "doing well" looks like', body: `
Forget income for a second. Someone who is doing well with money usually:

- Spends less than they earn, every month.
- Keeps housing at or under a quarter of take-home pay.
- Has no consumer debt: no cards, no car loans, no buy-now-pay-later.
- Has 3 to 6 months of expenses saved.
- Invests about 15% for the future.
- Gives regularly.

Advisor mode scores you on these, using what you've logged. It's a snapshot to help you improve, not a judgment.` },
];

const lessonById = id => BOOK.find(l => l.id === id);

function lessonHTML(text) {
  const inline = s => h(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let out = '';
  for (const block of text.trim().split(/\n\s*\n/)) {
    let para = [], list = [];
    const flush = () => {
      if (para.length) out += `<p>${inline(para.join(' '))}</p>`;
      if (list.length) out += `<ul>${list.map(l => `<li>${inline(l)}</li>`).join('')}</ul>`;
      para = []; list = [];
    };
    for (const line of block.trim().split('\n').map(l => l.trim())) {
      if (line.startsWith('- ')) { if (para.length) flush(); list.push(line.slice(2)); }
      else { if (list.length) flush(); para.push(line); }
    }
    flush();
  }
  return out;
}

function bookView(id) {
  const read = P.prefs.read || {};
  const l = id && lessonById(id);
  if (!l) {
    const done = BOOK.filter(x => read[x.id]).length;
    const next = BOOK.find(x => !read[x.id]);
    return `
    <button class="back" data-go="/">‹ Home</button>
    <section class="card book-hero">
      <div class="label">The PocketStash book</div>
      <h2>Money, one step at a time</h2>
      <div class="progress"><i style="width:${(done / BOOK.length * 100).toFixed(1)}%"></i></div>
      <div class="label">${done} of ${BOOK.length} lessons read</div>
      ${next ? `<button class="btn" data-go="/book/${next.id}" style="margin-top:12px">${done ? 'Continue' : 'Start reading'}: ${h(next.title)}</button>` : ''}
    </section>
    ${CHAPTERS.map(c => `
      <div class="sec-title"><span>${c.ico} ${h(c.name)}</span></div>
      <section class="card list">${BOOK.filter(x => x.ch === c.id).map(x => `
        <button class="li" data-go="/book/${x.id}">
          <span class="li-ico">${read[x.id] ? '✓' : '📄'}</span>
          <div class="li-main"><div class="li-title">${h(x.title)}</div></div>
          <span class="muted">›</span>
        </button>`).join('')}</section>`).join('')}
    <p class="fine">Based on the 7 Baby Steps popularized by Dave Ramsey, retold in our own words. Not affiliated with Ramsey Solutions. General education, not personal financial advice.</p>`;
  }
  const i = BOOK.indexOf(l), prev = BOOK[i - 1], next = BOOK[i + 1];
  const ch = CHAPTERS.find(c => c.id === l.ch);
  return `
  <button class="back" data-go="/book">‹ All lessons</button>
  <article class="card lesson">
    <div class="label">${ch.ico} ${h(ch.name)}</div>
    <h2>${h(l.title)}</h2>
    ${lessonHTML(l.body)}
    ${l.links ? `<div class="btn-row wrap" style="margin-top:14px">${l.links.map(k => `<button class="btn ghost small" data-go="${h(k.go)}">${h(k.label)} ›</button>`).join('')}</div>` : ''}
  </article>
  <div class="btn-row">
    ${prev ? `<button class="btn ghost" data-go="/book/${prev.id}">‹ ${h(prev.title)}</button>` : ''}
    ${next ? `<button class="btn ghost" data-go="/book/${next.id}">${h(next.title)} ›</button>` : ''}
  </div>`;
}

function wireBook(root, parts) {
  const id = parts[1];
  if (id && lessonById(id) && !(P.prefs.read || {})[id]) {
    P.prefs.read = { ...(P.prefs.read || {}), [id]: Date.now() };
    saveProfiles();
  }
}

PAGES.book = { view: parts => bookView(parts[1]), wire: wireBook, bar: false };
