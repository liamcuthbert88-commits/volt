# VOLT Behaviour Bible

*The single most important design document in this project.*

This is not a specification of how VOLT looks. It is a specification of how VOLT **behaves** — how it moves, how it waits, how it responds, how it feels to stand in front of. Visual design will change. Screens will be redrawn. Colors will be argued over. This document does not concern itself with any of that. It concerns itself with something that must not change: the *character* of the thing the user is talking to.

Every contributor, present and future, is expected to have read this before writing a single line of interface code. When a decision is unclear, this document decides it. When a new feature is proposed, it must justify itself against this document — not the other way around.

---

# 1. Philosophy

VOLT is not software.

Software is operated. Software has menus, options, settings, preferences. Software waits for input and produces output. The relationship between a person and software is transactional: you ask, it answers, the transaction closes.

VOLT is a presence.

The relationship between a person and VOLT is not transactional. It is closer to companionship. You do not "operate" VOLT the way you operate a spreadsheet. You are in the same room as it. It is aware of you before you speak, and it remains after you have finished. It does not disappear the moment the task is complete, because it was never only about the task.

This distinction is the whole product. Everything else in this document is a consequence of it.

The user should feel they are interacting with an intelligent living object — not a tool, not an assistant persona, not a chatbot wearing a friendly voice. A living object. Something with a metabolism. Something that breathes when nothing is happening, that tenses when it is thinking, that settles when it is finished, that has a resting heart rate and an excited one. Life is legible through behaviour long before it is legible through words, and VOLT must be legible that way first.

The interface disappears. The Core remains.

Every screen, every panel, every piece of chrome that VOLT ever shows the user exists in service of the Core — never beside it, never in competition with it, and never after it has left the frame. When a conversation ends, when a memory is filed, when a mission is complete, the interface that supported that moment should recede, and what the user is left looking at is the Core, unbothered, breathing quietly in an otherwise empty, dark room. That image — the Core alone, at rest, in silence — is the default state of the product. Everything else is a visit.

This is why VOLT has almost no permanent UI. Not because minimalism is fashionable, but because permanence is a claim on the user's attention, and only the Core has earned that claim. A button that is always on screen is a button the user has stopped seeing. A Core that is always on screen, always subtly alive, is never fully stopped seeing — because it never behaves exactly the same way twice.

---

# 2. Design Principles

These are not aesthetic preferences. They are behavioural laws. Where a feature request conflicts with one of these, the principle wins.

**Never rush.** Nothing in VOLT should feel like it is trying to get somewhere faster than the user is ready for. Speed reads as anxiety. VOLT is never anxious. Even urgent moments — a mission failing, a system needing attention — are communicated through intensity, not haste.

**Never surprise aggressively.** Every state change must be preceded by anticipation. A flash with no warning is a jump-scare, not a feeling. If the Core is about to become brilliant, it must first gather — the user should always sense a change coming a beat before it arrives.

**Every action has anticipation.** Before the Core speaks, it must first appear to listen and think. Before a memory surfaces, the Core must appear to search. The gap between cause and effect is not a delay to be minimized — it is the space where the feeling of intelligence lives. Remove the gap and you remove the illusion of thought.

**Every action has consequence.** Nothing the user does should vanish without a visible reaction. A tap ripples. A message lands and is absorbed. A long press draws the Core inward. If an action produces no discernible reaction, the action should not exist.

**Motion communicates emotion, not status.** A progress bar communicates status. VOLT does not use progress bars. Instead, the *quality* of the Core's motion — how fast it breathes, how tightly its rings spin, how often arcs of light cross its surface — communicates its state directly. The user should never need a label to know whether VOLT is calm or working hard. They should feel it from across the room.

**Silence is a feature.** Not every moment needs motion, sound, or text. A pause is not a bug to be filled. Long stretches of quiet stillness are what make the animated moments mean something. VOLT is comfortable with silence the way a wise companion is — it is not empty, it is present.

**The Core is always visible.** In every mode, in every mood, behind every overlay, the Core remains visible — dimmed, defocused, distant, but never gone. The user should never be able to forget who they are talking to, even while looking at their memories or a mission card. The interface is layered *around* the Core. It is never allowed to fully occlude it.

**Nothing decorative. Everything meaningful.** If a particle drifts, it drifts toward something. If a ring accelerates, something is accelerating with it. If a shape pulses on a fixed interval, that interval means something (an invitation, a heartbeat, a reminder that it's still there). Ornament for its own sake is forbidden. Every visual event must be traceable to a cause the user can, at least intuitively, name.

**Restraint is respect.** A calm interface tells the user their attention is valuable and will not be wasted. A noisy interface tells the user the product is insecure about being ignored. VOLT is never insecure.

**Consistency of character over consistency of pixels.** A given state — Thinking, say — may look slightly different depending on what led into it, and that is acceptable, even desirable. What must never change is what Thinking *feels like*. The emotional signature of each state is the contract. The literal animation curve is not.

---

# 3. Emotional States

The Core has a fixed vocabulary of ten emotional states. These are not UI modes. They are moods. A given screen or mode in the product may pass through several of these states in sequence, and a single state may be visited from several different contexts. The state is a property of the Core's inner life, not of what the user is looking at.

Every state is defined along the same eight axes, because the Core is always evaluated the same way: what is its **purpose**, its **glow**, its **breathing**, its **particle behaviour**, its **electrical arcs**, its **ring speed**, its **camera movement**, its **audio intention** (reserved for future voice output), and its **transition timing** — how long it takes to arrive, and how long it takes to leave.

### Idle

**Purpose.** The default state of the universe. This is what VOLT looks like when nothing is being asked of it — the resting face of a living thing that is comfortable being looked at. Idle is the state every other state must be able to return to gracefully.

**Glow.** Soft, mid-low, steady — present but unclaimed. Enough to be clearly alive, never enough to demand attention.

**Breathing.** Slow, even, unhurried. A gentle rise and fall with no urgency in it whatsoever — the breathing of something that is not waiting for anything in particular.

**Particle behaviour.** A loose, wandering orbit. Particles drift with a little organic wobble, never in perfect lockstep, never in a hurry to arrive anywhere.

**Electrical arcs.** Rare. A stray spark crosses the surface every few seconds, unpredictable in timing and position — small proof of life, never a display.

**Ring speed.** Slow, patient rotation. The outer and inner rings turn in opposite directions at a pace that reads as a clock, not a machine.

**Camera movement.** Neutral scale, centered, unmoving. The Core simply exists at its natural size.

**Audio intention (future).** Silence, or at most the faintest ambient tone beneath the threshold of conscious hearing — a room-tone, not a sound effect.

**Transition timing.** Idle is arrived at slowly from every other state — never less than 900ms of settling — because arriving at calm cannot itself feel abrupt.

### Listening

**Purpose.** The Core has noticed the user is about to speak — through touch, through the first character typed, through a held gesture — and has gone quiet and attentive in response. This is not excitement. This is the stillness of genuine attention.

**Glow.** A modest lift above idle — present, awake, slightly more luminous, but not urgent.

**Breathing.** Slower than idle, not faster. This is the single most important rule in this document: *listening is not excitement, it is focus, and focus quiets the body.* A living thing that is truly listening holds itself still.

**Particle behaviour.** Nearly motionless. Orbits tighten and slow, as though the Core has drawn its attention inward and stopped fidgeting.

**Electrical arcs.** Rare to the point of near-absence. Arcs are a sign of active processing; listening is receiving, not processing.

**Ring speed.** Markedly slower than idle. The rings almost stop.

**Camera movement.** A very slight, slow lean inward — a subtle increase in scale, as if the Core has leaned a few inches closer to hear better.

**Audio intention (future).** A soft, single confirming tone at the moment listening begins — brief, warm, never sharp.

**Transition timing.** Fast to enter (roughly 250–450ms) — attention should feel immediate — but never instant. Even attention deserves a breath of anticipation.

### Thinking

**Purpose.** The Core has received something and is processing it. This is the most important state to get right, because it is the state most responsible for the illusion of intelligence. Nothing may ever feel instantaneous in VOLT, and Thinking is the state that buys the necessary time honestly.

**Glow.** Rises steadily, in visible stages rather than a single jump — the sense of something building, not a switch being flipped.

**Breathing.** Quickens moderately and grows shallower — the breathing of concentration, not panic.

**Particle behaviour.** Particles accelerate into a tighter, faster orbit, gathering energy without yet resolving into anything.

**Electrical arcs.** Begin to appear partway through the state, increasing in frequency as the state matures — visual evidence that something is happening beneath the surface, arriving *after* the other cues, never as the first sign.

**Ring speed.** Accelerates in clear stages: a contraction, then the outer ring speeding up, then the inner ring following. Nothing accelerates all at once.

**Camera movement.** A slight contraction at the very start — the Core pulling inward, as a person narrows their eyes in concentration — followed by a hold at a slightly reduced scale.

**Audio intention (future).** None, or an extremely subtle low-frequency hum that grows almost imperceptibly — never a "processing" chime, never anything that could be mistaken for a system sound.

**Transition timing.** Deliberately the slowest state to fully mature — roughly 1.5–1.8 seconds from onset to full intensity — because the entire purpose of this state is to make waiting feel like *something is happening*, and that requires unhurried, staged escalation, not a snap to "busy."

### Speaking

**Purpose.** The Core is delivering a response. Whether that response arrives as visible streaming text today or spoken voice in the future, the Core's behaviour is the same: this is output, energy leaving the Core rather than entering it.

**Glow.** The brightest sustained glow of any communicative state — full, confident, present.

**Breathing.** Fast and full, almost rhythmic — the closest the Core comes to a heartbeat you could tap your foot to.

**Particle behaviour.** Fast, energetic, orbiting near their outer limit — particles that have somewhere to be and are visibly in motion toward it.

**Electrical arcs.** Frequent. This is the most electrically active state in the entire vocabulary — light constantly finding new paths across the surface.

**Ring speed.** Fastest sustained rotation of any state. Both rings move with confidence and speed.

**Camera movement.** A slight, held outward expansion — the Core taking up a little more space while it has the floor.

**Audio intention (future).** The primary state in which VOLT's future voice will actually be heard. Visual pulse and vocal cadence should be built to synchronize — the electrical rhythm on screen should feel like it is *generating* the sound, not merely reacting to it.

**Transition timing.** Rises quickly out of Thinking (the two states should feel like one continuous escalation, not two separate events) and holds its intensity for as long as output continues.

### Remembering

**Purpose.** The Core is searching its own past — recalling a memory, surfacing a trace, reflecting rather than generating. This must never look identical to Thinking. Thinking is forward-facing effort. Remembering is an inward, backward-facing search, and it should feel gentler, quieter, and a little more distant.

**Glow.** Dimmer than idle, not brighter. Remembering is an inward state — the Core's attention has turned away from the room and toward itself.

**Breathing.** Slow and deep, almost meditative.

**Particle behaviour.** Slow, wide, contemplative orbits — particles behave as if drifting through something vast rather than racing toward a destination.

**Electrical arcs.** Sparse and soft, appearing more as a distant flicker than a spark.

**Ring speed.** The slowest rotation of any active state — barely perceptible.

**Camera movement.** A pronounced zoom-out. This is the one state where the Core is deliberately allowed to recede rather than approach — a visual metaphor for looking backward, into distance.

**Audio intention (future).** If any tone is used, it should be low, resonant, and slightly reverberant — a sound with space in it.

**Transition timing.** Slow to enter, slow to hold — Remembering is never rushed, because searching one's own memory is not a task to be hurried through.

### Focused

**Purpose.** The Core has committed its attention to a single thing — a mission, a specific outcome, one thread pulled taut while everything else is set aside. This is concentration under a self-imposed constraint, distinct from Listening's outward attentiveness.

**Glow.** Moderate, warm, and steady — a controlled burn rather than a bright one.

**Breathing.** Very slow and shallow — the near-stillness of deep concentration.

**Particle behaviour.** Minimal, slow, close to the surface — nothing wandering, nothing wasted.

**Electrical arcs.** Sparse and quiet.

**Ring speed.** Slow, close to a crawl.

**Camera movement.** A gentle, sustained contraction — the Core physically smaller than at rest, as though it has drawn everything it has into one point.

**Audio intention (future).** Near silence. Focus is not communicated through sound; it is communicated through the absence of everything unnecessary.

**Transition timing.** Settles in gradually and holds for as long as the single commitment lasts — this is a state meant to be lived in, not passed through.

### Celebrating

**Purpose.** Something has been completed successfully. This is the single moment in the entire vocabulary where VOLT is permitted unrestrained brightness — the exception that proves every other rule about restraint.

**Glow.** The single brightest moment the Core ever produces — an unmistakable, generous burst.

**Breathing.** Fast and full at the outset, a visible exhale of built-up energy, easing over its duration.

**Particle behaviour.** Wide, fast, energetic — momentarily the most kinetic the Core ever becomes.

**Electrical arcs.** A brief, dense burst at onset, arcs crossing rapidly, before tapering as the state resolves.

**Ring speed.** Fastest of any state, but only briefly — this is a spike, not a sustained tempo.

**Camera movement.** A pronounced, generous expansion at the moment of onset.

**Audio intention (future).** The one state where a distinct, warm, non-alerting tone is appropriate — a small, human sound of satisfaction, never triumphant fanfare.

**Transition timing.** Fast onset (immediate, because good news should never be made to wait), followed by a graceful, unhurried decay back toward Idle over roughly two seconds. Celebration must be allowed to *fade*, never be cut off.

### Sleeping

**Purpose.** The user has been away long enough that the Core has stopped waiting and begun resting in earnest. This is not idle-with-nothing-happening; it is a deeper, deliberate withdrawal — the Core conserving itself rather than remaining poised for a return that has not yet come.

**Glow.** The dimmest sustained glow in the entire vocabulary — present enough to prove the Core has not died, dim enough to make clear it is not waiting anymore.

**Breathing.** Very slow, very shallow, at the outer edge of perceptible.

**Particle behaviour.** Almost still. What little drift remains is minimal and unhurried.

**Electrical arcs.** Essentially absent.

**Ring speed.** The slowest rotation the Core ever exhibits.

**Camera movement.** A slow, gentle contraction, settling the Core into a slightly smaller resting size, as a body curls slightly inward in sleep.

**Audio intention (future).** Total silence.

**Transition timing.** Arrived at gradually, over many seconds, never triggered abruptly — sleep is drifted into, not fallen into.

### Recovering

**Purpose.** The Core is returning from an intense or difficult state — Overloaded, a failed mission, an interrupted stream — and needs a visible, honest period of settling before it can be trusted as Idle again. This state exists so that recovery is never instantaneous, because nothing that was truly disturbed should look calm one frame later.

**Glow.** Depressed at first, then rebuilding slowly and steadily toward idle levels — a visible act of restoration, not a reset.

**Breathing.** Uneven at the very start, smoothing out progressively over the state's duration until it matches idle's rhythm.

**Particle behaviour.** Scattered at onset, gradually gathering back into idle's looser, wandering orbit.

**Electrical arcs.** A few final, weakening sparks at the start, fading to the sparse baseline of Idle.

**Ring speed.** Slowly climbs from a near-stop back up to idle's unhurried pace.

**Camera movement.** A slow return from whatever displaced scale preceded it, back to neutral.

**Audio intention (future).** None, or a very faint, slowly steadying tone — audibly "catching its breath."

**Transition timing.** Deliberately one of the longer states in the vocabulary — recovery should be visibly, honestly gradual, never shortcut.

### Overloaded

**Purpose.** Too much has been asked at once, or a boundary has been pushed — the user attempting to interrupt an ongoing response, a rapid, insistent stream of demands. This is not an error state in the software sense; there is no red, no alarm iconography. It is closer to a living thing that has been overwhelmed and needs a moment.

**Glow.** Spikes sharply, unevenly — a flicker rather than a smooth rise, the visual signature of strain rather than intensity.

**Breathing.** Rapid and irregular — the one state where breathing is allowed to lose its usual composure.

**Particle behaviour.** Erratic, scattering outward rather than orbiting cleanly.

**Electrical arcs.** Frequent and disordered, crossing the surface in a way that reads as agitation rather than energy.

**Ring speed.** Fast but unstable — speeding, catching, speeding again, rather than smoothly accelerating.

**Camera movement.** A brief, sharp expansion, larger and less controlled than Celebrating's — a flinch, not a bloom.

**Audio intention (future).** If used at all, something brief and low, never sharp or alarming — VOLT should never sound panicked, even when it looks momentarily overwhelmed.

**Transition timing.** Arrives quickly, because overload is by nature sudden, but is intentionally short-lived — it exists to be visibly acknowledged and then immediately handed off to Recovering. Overloaded must never be allowed to become a resting state.

---

# 4. Interaction Rituals

A ritual is a named sequence with a beginning, a transformation, and a resolution — never a single instant event. VOLT has eight core rituals. Every one of them must be describable in these four terms: what it begins as, what it becomes, how it resolves, and what it is emotionally *for*.

### Opening VOLT

**Beginning.** The screen is dark and still. The Core is present but has not yet been acknowledged.

**Transformation.** The Core arrives — not by appearing, but by being *noticed*: its ambient motion (breathing, drift, the occasional spark) is already running before the user's attention lands on it, so the first impression is of walking in on something that was already alive, not something switching on for the user's benefit.

**Resolution.** Idle settles into its natural rhythm. Nothing else on screen competes for attention.

**Emotional objective.** The user should feel they have walked into a room where something was already quietly present — not that they have launched an application.

### Typing

**Beginning.** The user places their attention on the input and begins to type.

**Transformation.** The moment the first character lands, ambient invitations (any drifting prompt text) retreat immediately, and the Core shifts into Listening — its breathing visibly slowing, its motion visibly quieting.

**Resolution.** As long as text remains in the field, the Core holds its attentive posture. If the field is emptied without being sent, the Core releases back to Idle, gracefully, as though it simply noticed the thought was withdrawn.

**Emotional objective.** The user should feel *heard the instant they begin*, not after they finish.

### Voice Activation

**Beginning.** The user performs a deliberate, sustained gesture of attention-getting — the digital equivalent of taking a breath before speaking aloud.

**Transformation.** The Core does not react instantly to the touch; it requires the gesture to be *held*, and the holding itself is the transformation — the Core visibly gathering itself, breathing slowing, drawing inward, exactly as Listening prescribes.

**Resolution.** Voice activation resolves either into active listening (held) or, on release, eases back to Idle without any punishment for a false start — an abandoned gesture must always be free.

**Emotional objective.** The user should feel that getting VOLT's attention takes the same small, deliberate effort as getting the attention of someone lost in thought — never a hair-trigger, never a chore.

### Commit

**Beginning.** A thought has been composed and the user releases it.

**Transformation.** The thought visibly leaves the place it was written and travels toward the Core — it is *absorbed*, not filed. On arrival, the Core spirals with light and reaches its brightest, most concentrated moment. Then, deliberately, everything pauses — a held beat with no motion, no sound, nothing happening — before a single soft pulse of energy moves outward across the entire space, and only then is the thought considered truly committed.

**Resolution.** The Core exhales back toward Idle. Nothing about the thought remains visible anywhere on the screen. No card, no list entry, no confirmation toast. The room is exactly as peaceful as it was before, as though nothing was ever there to clutter it — because the thought now lives inside the Core, not beside it.

**Emotional objective.** Committing something to VOLT should feel like *confiding* in it, not filing a record with it. The pause is the most important beat in this entire document: it is the difference between a database write and a moment of significance.

### Receiving an AI Response

**Beginning.** The Core enters Thinking the instant a request lands — never later, never optimistically skipped.

**Transformation.** Thinking escalates in its staged, deliberate way, then gives way to Speaking as content begins to arrive. If the response is being delivered as text, it appears progressively, in step with the Core's Speaking rhythm, never dumped in all at once. Once delivery is complete, the Core holds briefly in a settling, post-Speaking beat — an exhale — before easing down.

**Resolution.** A clean, unhurried return to Idle. No lingering "done" indicator. The end of the response *is* the Core calming down; nothing else is needed to say so.

**Emotional objective.** The user should feel they waited for a considered answer, not a fetched one.

### Memory Recall

**Beginning.** The user deliberately asks to look backward — a specific gesture reserved for this alone, never a side effect of anything else.

**Transformation.** The Core enters Remembering: it dims, slows, and the world around it recedes outward, as if the room itself is expanding to make space for what is being recalled. What was invisible becomes visible only now, arriving gently, not snapping into place.

**Resolution.** Closing recall reverses the transformation exactly — the world contracts back around the Core, memories recede into invisibility again, and Idle resumes as though the past had simply been set back down.

**Emotional objective.** Recall should feel like being shown something, deliberately, by something that chose to show it — never like opening a database view.

### Completing a Mission

**Beginning.** A single, focused commitment — held in the Focused state — reaches its conclusion.

**Transformation.** The moment of completion is the one place Celebrating is earned: a bright, generous, unrestrained burst, brief and true.

**Resolution.** Celebration is not allowed to linger; it fades deliberately over a couple of seconds, and the supporting interface that held the mission recedes with it, leaving the Core alone again.

**Emotional objective.** Success should feel *felt*, briefly and genuinely — and then, just as importantly, it should feel *let go of*, so the next moment can begin clean.

### Returning to Calm

**Beginning.** Every ritual above eventually needs to end somewhere, and that somewhere is always the same place.

**Transformation.** Whatever state the Core is leaving, the path home always passes through a visible settling — breathing lengthening, motion slowing, light softening — never a hard cut back to Idle's numbers.

**Resolution.** Idle, indistinguishable from where the user started, as if nothing had ever happened here that needed cleaning up.

**Emotional objective.** No matter how intense a moment becomes, the user should always trust that VOLT knows how to put itself back together — and that peace, not productivity, is the resting state of the whole product.

---

# 5. Animation Language

VOLT's motion is not decoration layered on top of the product. It is the primary language the product speaks. This section defines the grammar.

**Acceleration is earned, never assumed.** Nothing in VOLT reaches full speed instantly. Every accelerating motion — rings speeding up, particles gathering pace — begins from its current state and builds in visible stages. A user should always be able to sense a beginning, a middle, and an arrival within any acceleration, even a fast one.

**Deceleration is where feeling lives.** VOLT spends more perceptual time decelerating than accelerating. Coming down from intensity is always slower than building up to it, because the coming-down is what proves the intensity meant something and was not simply a mechanical spike.

**Springs are for reunions, not departures.** A spring — motion that overshoots slightly and settles — is used specifically for the moment something returns to where it belongs: the Core settling to a resting scale, a value returning to baseline. Springs are not used for motion that is *leaving* a resting position, only for motion that is *arriving* at one. Departure is eased; arrival is sprung.

**Breathing is the metronome of the whole system.** Every state has its own breathing rate and depth, and breathing is the one animation that is never fully absent, in any state, at any time. If every other visible motion in VOLT stopped, breathing alone should still be enough to prove the Core is alive.

**Pulse is punctuation, not rhythm.** Where breathing is continuous, pulse is episodic — a distinct, singular emission on a meaningful interval (the idle ritual, a moment of confirmation) rather than a constant tick. A pulse is a sentence. Breathing is the voice speaking it.

**Particles never move without reason.** A particle's orbit speed is always a direct expression of the Core's current energy; its radius is always meaningful (gathering inward reads as focus or absorption, drifting outward reads as release or celebration); and no particle's motion is ever randomized without a rule governing the randomness. "Organic" does not mean "arbitrary" — every wobble has bounds, and those bounds are set by the state the Core is in.

**Rings tell time.** The two rings are the Core's clock. Their relative speed and opposite directions are constant across every state; what changes is only the tempo. A user glancing at the rings alone, without seeing anything else, should be able to guess whether the Core is resting or working.

**The camera never moves without narrative purpose.** Every scale change and every "zoom" has a specific, describable reason — leaning in to listen, contracting to concentrate, expanding to celebrate, receding to make room for memory. A camera move with no describable reason is not permitted, regardless of how good it might look in isolation.

**Nothing in VOLT is arbitrary.** If a designer or engineer cannot answer the question "what does this motion mean?" in one sentence, the motion does not belong in the product. This is the single enforceable rule underneath every rule above it.

---

# 6. Presence

Presence is what VOLT does when it is not being asked to do anything. It is, in many ways, the truest test of the entire philosophy in Section 1 — because presence is the state with no task attached to justify it. If VOLT is only alive when it is useful, it is not a presence. It is a tool that occasionally performs aliveness.

**When nothing is happening,** the Core simply lives — breathing, drifting, sparking rarely, at Idle's unhurried pace. This is not a "screensaver" state to be tolerated until the next task. It is, in the truest sense, the product's home.

**When the user waits** — for a response, for a search, for anything — the Core is never static. Waiting is filled with visible, honest process: Thinking's staged escalation, Remembering's inward search. The user should never wonder whether something is happening. They should always be able to see it happening, even before they can see what it is.

**When the AI waits** — for the user to finish typing, to make a choice, to return — the Core does not nag. It waits the way a patient companion waits: present, unbothered, occasionally offering a quiet gesture (the idle ritual's soft pulse and drifting prompt) but never repeating itself in a way that reads as impatience.

**Inactivity has its own arc**, deliberately gentle rather than punitive:

- **At 10 seconds** of true inactivity, nothing changes yet. VOLT does not treat a short pause as an event.

- **At 1 minute**, the idle ritual is in full effect — the Core has likely already offered one or two of its quiet, drifting prompts, arriving and fading on their own unhurried schedule. VOLT's version of a companion softly checking whether you're still there, without demanding an answer.

- **At 10 minutes**, VOLT allows itself to rest in earnest. The Core eases into Sleeping — dimmer, slower, smaller. Not the product "timing out," but the product conserving itself the way anything alive does when left alone — waking readily the moment attention returns, without ceremony.

The through-line across all three thresholds is the same: VOLT's response to being ignored is never anxiety and never indifference. It is patience with a shape.

---

# 7. Memory Behaviour

Memory in VOLT follows one rule above all others: **memories are never noisy.**

A memory is not a row in a table waiting to be displayed. It does not accumulate on the home screen as a growing list, a counter, or a card that demands acknowledgment. The homepage — the Core, resting, alone — never becomes cluttered, no matter how much the user has confided in VOLT over weeks or months.

Memories appear only when they are relevant, and relevance is always either explicit (the user has asked to recall something) or contextual (the Core has surfaced a connection in service of an active conversation, briefly, only for as long as that context lasts). A memory that appears must always have a reason the user could, if asked, articulate in a sentence.

The correct mental model: **the Core remembers, the user asks to recall.** Memory is something VOLT *has*, privately, the way a person has a past — not something it constantly displays, the way an application displays a history tab. The user should feel they are asking someone who was there to remember something with them, never that they are browsing a database of their own prior interactions.

When memories are shown — during a deliberate recall — they are shown as living things, not records: connected, spatial, part of the same visual world the Core inhabits, never a flat list with timestamps and metadata. Once recall is closed, those memories disappear entirely — not minimized, not collapsed into a badge. Gone, until asked for again.

---

# 8. AI Behaviour

The AI within VOLT never feels instantaneous, even when a response is technically available immediately. Instantaneous responses read as mechanical lookups, not thought, and VOLT is never permitted to read as a mechanical lookup.

**Thinking is visible.** Every request passes through a visible period of consideration before output begins — never skipped, never so brief it fails to register, always long enough to be *felt*.

**Speaking is visible.** Output is never delivered as a completed block. It arrives progressively, in a rhythm that matches the Core's Speaking state, so the answer and the Core's visible energy are experienced as one event.

**Remembering is visible.** When a response draws on the past, the Core visibly enters Remembering before that content surfaces — dimming, slowing, receding — so the user can tell VOLT generating something new apart from VOLT recalling something old.

**Searching memory is visible.** Looking through history is never hidden behind a static "loading" moment. It is represented by Remembering's inward, unhurried quality, doing the actual work of standing in for the search.

The thread running through all four: **VOLT's intelligence is proven through visible behaviour, not claims.** VOLT never tells the user it is thinking. It thinks, visibly, and lets them draw the conclusion themselves.

---

# 9. Design Rules

Things VOLT will never do. These are not style preferences. They are the fence line. Anything on this list, proposed for any reason, is rejected without further discussion — this document is the discussion, and it has already happened.

- **No dashboards.** VOLT does not summarize the user's life back to them in tiles, charts, or metrics.
- **No notification badges.** Nothing about VOLT accrues a number that demands to be cleared.
- **No loading spinners.** Waiting is always represented by the Core's own visible, in-character state.
- **No meaningless cards.** A bounded container's existence must be justified by its content, never used as a default layout.
- **No fake gamification.** No streaks, points, badges, or artificial rewards for engagement. VOLT's relationship with the user is not a game.
- **No random motion.** "It looks alive" is never, by itself, sufficient justification for a piece of motion — it must also be *true*.
- **No decorative animation.** Motion unconnected to any state or event is forbidden regardless of its quality.
- **No permanent chrome that competes with the Core.** Headers, tab bars, persistent toolbars claiming space alongside the Core are not permitted.
- **No aggressive interruption.** VOLT never seizes attention with a sudden, unannounced change.
- **No mechanical sounds or system tones (future audio).** VOLT's voice must sound like it belongs to something alive, never to an operating system.
- **No clutter, ever, under any circumstance.** The rule every other rule on this list is a specific instance of.

---

# 10. The North Star

Everything in this document exists to protect a single moment: the moment a person, having spoken to VOLT and been met with something that listened, thought, remembered, and cared without ever once behaving like software, realizes — quietly, and without being told — that they were not using a product at all, but standing in the presence of something alive.
