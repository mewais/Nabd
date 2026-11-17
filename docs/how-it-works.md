# How it works

- **The plan** (Plan screen) is either _fixed_ — specific exercises per day — or
  _cycled_ — each day targets muscles, and each muscle rotates through a pool of
  exercises, moving on to the next one each time the day comes round. Days are pinned
  to weekdays (at most one per weekday, so seven), or _floating_: Day 1, 2, 3 … in
  order, moving on once a day owes nothing more — completed, skipped, or empty. An
  unfinished floating day comes back the next day, with only what is still owed: the
  sets already logged for each exercise on the earlier days count as done (an exercise
  that is whole shows as done and is not nudged for, and a warm-up done yesterday means
  today starts at the first working set), and the plan moves on when the rest is done.
  What was done is counted by kind of set (warm-ups, working sets, drop sets), so an
  edit afterwards — a warm-up deleted, a set's kind changed — never turns a working set
  that was done into a warm-up; and it counts for the exercise it was done on, so a pool
  that has since moved on from that exercise owes its new one in full. The same count
  holds within a day: a prescribed warm-up is owed like any other set, so an exercise is
  whole only once each kind it prescribes is done, and extra sets of one kind never stand
  in for another. Such a day is one
  visit, and one session, however many calendar days it takes: its sets are compared
  with the session before the visit, not with each other (see Suggestions), and the
  logger says which day it continues ("Continuing Monday's Push"). A set logged while a
  visit continues belongs to its session, and any other set — on a weekday plan, or on a
  floating day begun that day — to its own date's, whatever else that day logged or a
  switch of schedule left behind; an edit that leaves the plan on the visit's day keeps
  the visit, even when it takes away all the visit carried. A skip is for its
  calendar day only, so a skipped exercise is owed again; the one exception is that a
  day owing nothing moves on. Skipping the whole day (Skip today, see Nudges) makes it a
  day off for the plan: a floating day comes back the next day as it was, and a weekday
  plan's day is on record as skipped, not missed. Each calendar day puts on record what it owed and what it
  did, so a day that came back for two sets and did them is 100%; a day it merely waited
  on is not a missed day, so only days with a set (or that the plan moved on from) count
  toward completion — the day the plan is on counts from the start, so Progress shows
  what Today shows. A weekday plan has no such memory: its days belong to the calendar
  (switching to weekdays and back on the same day finds the unfinished day as it was;
  the weekday plan's next day forgets it). A few rules hold whatever is edited, stored
  or imported:
  - whether a set is counted in reps or in seconds is the exercise's doing, not a
    choice: a rep-counted exercise is prescribed as a range or a fixed number, a hold in
    seconds. A cycled pool shares one prescription, so it holds one kind — the kind of
    its first exercise — and the library only offers that kind for it;
  - a pool is tracked by exercise, not by position, so editing it never skips or
    repeats one — and on a floating plan a pool moves on only when its day does, so a
    day that comes back is on the same exercises;
  - a superset stays together: an exercise moved past it steps over the whole group, a
    member moves within it, and a member moved out past its edge is unlinked. The
    supersets of a day are lettered A, B, C … (A1/A2, B1/B2);
  - a weekday plan has one day per weekday: a stored or imported one with a second day on
    a weekday (or a day on none) moves that day to the first free weekday after it, and
    one with more than seven days runs floating, every day kept;
  - switching between weekdays and floating keeps today on the day it is on: going
    floating starts on today's weekday's day (the first day, on a rest day); going
    weekdays pins the current day to today and the days after it to the weekdays that
    follow;
  - a set prescribed at an RPE is at RPE 5–10, at a %1RM at 40–100% — what the planner's
    steppers allow, and what a stored or imported value outside them is held to;
  - deleting a day or a custom exercise, and importing over what is stored, ask first;
  - the planner opens on today's day — on a rest day, on the plan's first day (the
    earliest in the week, Monday first, for a weekday plan). Where the window is too
    narrow for the day being edited and the coverage rail side by side (near its
    smallest, 980 × 640), the rail goes under the editor.
- **Today** is derived, never stored: the plan for the day, plus the sets logged today.
  Edit the plan and Today changes immediately; restart the app and nothing is lost. A
  set whose exercise has since left the plan (or the library) is still listed and
  counted, and a logger open on an exercise that leaves the queue moves on to the next
  one (or closes) rather than linger.
- **Nudges** follow four rules:
  1. never outside the workday or on a day off (Settings → Workday: the hours, and the
     weekdays worked — Monday to Friday unless changed, whatever the schedule), on a day
     skipped, while paused, or with nothing left. The top bar says when nudging resumes
     ("Quiet until Mon 09:00"), and its nudge menu — a button reading Pause, or Paused,
     Skipped or Nudging while one is in force — pauses nudges until the day ends and holds
     today's one choice of the two below. A day off still shows its plan and takes sets,
     but owes nothing until a set is logged on it: an idle one neither moves a floating
     plan on nor counts toward completion. The streak counts workdays only: a workday with
     a set adds to it, a workday without one ends it, and days off do neither, so a
     Monday-to-Friday streak carries over the weekend;
     - **Skip today** (the top bar's nudge menu, the nudge toast, the tray), for a day you
       will not train (the office, a coffee shop): no nudges until tomorrow, and the top
       bar says "Skipped today". The day is a day off for the plan: a floating day comes
       back tomorrow as it was, with what is still owed, and a weekday plan's day neither
       counts against completion nor ends the streak. Sets can still be logged on it:
       they count as on any day (toward the plan, completion and the streak), and the day
       stays quiet. Resume today takes the skip back the same day; it ends by itself at
       midnight;
     - **Nudge me today**, offered instead (in the nudge menu and the tray) while it is
       quiet for a day off or outside the workday hours (a one-off Saturday, a late
       start): nudges then follow rules 2–4, counting from the moment it was switched on
       as from a launch, until the day owes nothing more or ends — never into the next day
       — and Stop nudging today turns it off again. A day off so nudged owes its plan like a workday; it adds to the streak
       if a set is logged on it, and never ends it;
  2. the timer nudges _interval_ minutes after your last set (before the first one: after
     the workday started, the app was launched, the plan got work, or a quiet day was
     nudged on — whichever is latest);
  3. an idle moment (no keyboard or mouse for the _idle moment_ setting) nudges earlier —
     but never sooner than the _minimum gap_ after the moment the timer counts from (your
     last set, or before the first one, the start of the workday, the launch or the plan
     getting work), so the start of the day is never an idle moment;
  4. Snooze silences both for five minutes.

  A nudge that has fired stays up until it is answered — Start, Snooze, Skip today, a
  logged set or Pause — even if you touch the mouse in the meantime, and the sets you
  then log are recorded as prompted by it. It shows as a toast in the window and, when the window is
  not in front, as a desktop notification (a window hidden in the tray is also brought
  back, unfocused). Left unanswered, the notification is repeated once per _interval_
  for as long as the window stays out of focus; the toast stays the one toast. Opening
  the logger answers it; closing the logger without logging keeps it quiet for the
  length of a snooze.

- **A nudge is an invitation, not a limit.** The logger lists all of today's exercises;
  log one set or as many as you have time for, in any order. Supersets alternate, rest
  between back-to-back sets is counted down, any exercise can be skipped for the day
  (and restored), and anything not in the plan can be logged as an extra ("log
  something else" on an exercise that is already in today's queue goes to that
  exercise). A set beyond an exercise's prescription keeps the form on that exercise.
  Reps and weight can be stepped (− / +, or ↑ / ↓ in the field: one rep, five seconds,
  one weight increment) or typed — a field can be emptied and retyped, and goes back to
  its last number if left empty — and Enter logs the set. A number typed finer than its
  field holds (whole reps, a weight to two decimals) is taken as its rounded value, and
  the same single Enter logs it. A weight reads exactly as it
  was entered, to two decimals, so quarter steps read exactly; shown in the other unit
  it is a conversion, rounded to one decimal (20 kg is "44.1 lb"). The form's own
  field always holds two decimals, so it can be stepped by the finest increment.
- **Nothing logged is lost quietly.** A logged set shows at once, marked "not saved
  yet" until the database has it, and the logger's count of the day says how many are
  not ("3 sets logged today, 1 not saved yet"). A set the database would not take stays
  marked, and is retried on every clock beat, after any save that works, and before an
  export or quitting — from Settings, the tray menu, Cmd+Q, or by
  closing a window that has no tray to hide in, alike (each of those is carried out by
  the window, which saves first; if the window cannot answer within three seconds the
  app exits anyway). What the app is never told of cannot wait for it: the session
  ending under it (logging off, shutting down), the Dock menu's Quit on a Mac, or the
  process being killed — a set not saved yet by then is lost. A set counts toward the
  day that is open when it is logged, so it stays in today's list even if the clock is
  set back meanwhile. Before an import replaces anything, a backup export
  (`nabd-backup-before-import-…json`) is written next to your exports; an export says
  so when it had to leave out sets that are not saved yet, or that could not be read.
  Stored settings are read field by field, so one bad value only resets itself.
- **Older data is brought along.** Whatever an earlier version stored, or exported, is
  upgraded as it is read (and written back in today's shape): the field names of
  prescribed sets (export format 3), the old "translucent" theme, plans and rotations
  that pointed at positions instead of ids, and exercises the catalog has since retired
  — a single-arm variant of two-handed equipment becomes the two-handed exercise, and
  an unfinished day's carried sets, once counts of its first prescribed sets, become
  the kinds of those sets, of the exercise each was on (export format 5). What came
  later (the workdays, export format 4; a set's session and your body weight, format 5;
  a day skipped or nudged on, and the days on record that were, format 6) is simply
  missing from older data and takes its default: Monday to Friday, each set the session
  of its own date, body weight not given, no day skipped or nudged on. The database follows suit
  (schema version 3 gives every stored set the session of its date).
- **Suggestions** use double progression against the same set of your previous session
  (a session is one visit to a program day: a calendar day's sets, or all the sets of
  an unfinished floating day that came back, whichever days they were logged on):
  inside your rep range → one more rep (or, alternatively, the same reps with more
  load); at the top → more load, back at the bottom of the range; below it → hold the
  load; below it two sessions running → back off one step. "More load" is your own
  weight increment (Settings → Training; 2.5 kg or 5 lb unless you choose your own,
  which a change of unit leaves alone), so 8 × 25 lb suggests 9 × 25 lb or 8 × 27.5 lb.
  Where a set is prescribed at a %1RM or an RPE and the exercise has an estimated 1RM
  (Epley, from its latest session, reading at most 15 reps of a set), the load follows the prescription instead, rounded
  to your increment, for the bottom of the rep range: a %1RM is that share of the
  estimate ("70% of your estimated max (86 kg)"), an RPE is 10 − RPE reps in reserve,
  the load at which the prescribed reps plus those in reserve make up the estimate
  ("RPE 8 ≈ 2 reps in reserve"). Plain double progression stays the alternative. Until
  there is history — or, with history, until a session moved a load — the advice is
  plain double progression and says what the intensity is waiting for; a hold and
  bodyweight reps ignore it. A weighted or assisted bodyweight exercise moves your body
  weight with its load added (or its assistance taken off), so its estimate, and the
  load an intensity asks of it, count your body weight (Settings → Training → Body
  weight, in your unit, empty until you give it); without it such an exercise ignores
  the intensity and says to set your body weight in Settings to use it. A bodyweight
  exercise whose load would round to nothing stays reps-first. Every load suggested is
  one the form takes: never above the most a set can record (1000 kg), and never less
  than one increment for an exercise that needs a bar or a dumbbell — a deload there
  stops at one increment, and the form's − does too; a load typed outside those bounds
  is not taken: Enter or leaving the field brings back the last load it took, and that
  Enter does not log the set.
  A bodyweight exercise with nothing added is plain reps — "12 reps", then "8 + 2.5 kg
  or 13 reps" at the top of the range — and only an exercise that needs a bar or a
  dumbbell asks you to pick a starting weight. Warm-ups are left out of progression,
  volume and trends; the form remembers your last warm-up separately, and starts each
  kind of set (warm-up, working, drop) from its own numbers. A first warm-up, with none
  on record, starts from half the last working load, rounded to your weight increment,
  for the reps the plan asks. An exercise's trend has one unit: an estimated 1RM (of the
  load alone) once it has ever been loaded, reps or seconds until then.
- **Closing the window hides it**; the app lives in the tray, on a Mac the menu bar (Start next set, Pause
  nudges, Skip today — or, on a quiet day, Nudge me today — Open, Quit). Where the desktop shows no tray icons (stock GNOME without the
  AppIndicator extension) the app is an ordinary window: closing it quits (once the
  window has saved what is pending), and "Start minimized" is switched off in
  Settings, which says why. Settings → Quit Nabd always exits.
- **The keyboard reaches everything.** A row of options (theme, unit, plan type…) is
  one tab stop, chosen with the arrow keys, Home and End; a drop-down list opens on ↓,
  moves with the arrows, Home, End or an option's first letter, picks with Enter and
  closes with Escape. Every − and + says what it steps ("Decrease reps"), and every
  button of Today's queue which exercise it acts on ("Skip Barbell Bench Press").
