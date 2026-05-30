# Visual Flow Guide - Progressive Disclosure

## Complete User Journey Visualization

### 🎯 Starting Point: Dashboard Landing

```
┌─────────────────────────────────────────────────────────────┐
│                    VANTA Dashboard                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         Competitor Intelligence Scanner                     │
│                                                             │
│    Enter a competitor name to begin a live scan            │
│                                                             │
│    ┌─────────────────────────────────────────────┐        │
│    │ 🔍  e.g. Salesforce, Zendesk...  [Run Scan] │        │
│    └─────────────────────────────────────────────┘        │
│                                                             │
│    [Salesforce] [HubSpot] [SAP] [Zendesk] [Oracle]        │
│                                                             │
│    ┌─────────────────────────────────────────────────┐    │
│    │  Weekly Vulnerability Index                     │    │
│    │  ┌──────────────────────────────────────────┐  │    │
│    │  │ Competitor  | Vuln | Trigger | Signals  │  │    │
│    │  │ Salesforce  | 78%  | Pricing | 142      │  │    │
│    │  │ HubSpot     | 65%  | Support | 89       │  │    │
│    │  └──────────────────────────────────────────┘  │    │
│    └─────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### ⚡ Phase 1: SCANNING STATE (0-15 seconds)

**User clicks "Run Scan" → Immediate transition to scanning view**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Dashboard    SCANNING: HubSpot    [3 / 7 / 12]           │
├─────────────────────────────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Animated
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│              🟢 Agent Activity                              │
│                                                             │
│    ┌─────────────────────────────────────────────────┐    │
│    │                                                  │    │
│    │  • MCP signal: Scaling Data-Driven Technology   │    │
│    │    Company — Pricing                            │    │
│    │                                                  │    │
│    │  • search_web("HubSpot pricing complaints")     │    │
│    │                                                  │    │
│    │  • 12 results found                             │    │
│    │    reddit.com/r/sales/comments/...              │    │
│    │                                                  │    │
│    │  • scrape_url(reddit.com/r/sales/...)           │    │
│    │                                                  │    │
│    │  • 4,523 chars scraped                          │    │
│    │    "I'm looking for CRM alternatives. My need   │    │
│    │     is automation workflow and CRM..."          │    │
│    │                                                  │    │
│    │  • MCP signal: Mid-Market Sales Organization    │    │
│    │    — Feature Gaps                               │    │
│    │                                                  │    │
│    │  • search_web("HubSpot feature gaps")           │    │
│    │                                                  │    │
│    │  • 8 results found                              │    │
│    │                                                  │    │
│    │  🔄 Agent working...                            │    │
│    │                                                  │    │
│    └─────────────────────────────────────────────────┘    │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

USER MENTAL STATE:
✓ "The agent is working"
✓ "I can see progress"
✓ "I trust the process"
✓ Single focus: Watch the activity
```

---

### 🎉 Phase 2: COMPLETION MOMENT (15 seconds)

**Scan completes → Celebration overlay appears**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│              ┌─────────────────────────────┐               │
│              │  ✓  Scan Complete           │               │
│              │     7 opportunities found   │               │
│              └─────────────────────────────┘               │
│                    ↑ Green gradient                         │
│                    ↑ Appears for 3 seconds                  │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

ANIMATION SEQUENCE:
1. Activity feed stops updating
2. 300ms delay
3. Completion badge slides down from top
4. Badge pulses once (scale 1 → 1.05 → 1)
5. Badge stays visible for 3 seconds
6. Transition to results view begins

USER MENTAL STATE:
✓ "It's done!"
✓ "I found 7 opportunities"
✓ Positive emotional response
✓ Ready to review results
```

---

### 📊 Phase 3: RESULTS STATE (15+ seconds)

**Automatic transition to results view**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Dashboard    COMPLETE: HubSpot    [7 signals | 3 🔥]      │
├─────────────────────────────────────────────────────────────┤
│  $72,450 Pipeline | 72h Saved | 1342% ROI | 7 High-Intent  │
├─────────────────────────────────────────────────────────────┤
│  ▼ Activity Log (collapsed)                    [Click ↓]    │
├─────────────────────────────────────────────────────────────┤
│  Intent Signals (7)                    [3 high-intent]      │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ [9] 🔴  Scaling Data-Driven Technology Company    │    │
│  │          HackerNews | SaaS | 50-200               │    │
│  │          Pricing                                  │    │
│  │          "I'm looking for CRM alternatives. My    │    │
│  │           need is automation workflow and CRM..." │    │
│  │                                        [Review]   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ [7] 🟡  Cost-Conscious Startup                    │    │
│  │          Reddit | Technology | 11-50              │    │
│  │          Pricing                                  │    │
│  │          "For startups, it's a cheaper alternative│    │
│  │           to HubSpot. HubSpot/Salesforce/Marketo" │    │
│  │                                        [Review]   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │ [7] 🟡  Mid-Market Sales Organization             │    │
│  │          HackerNews | SaaS | 50-200               │    │
│  │          Feature Gaps                             │    │
│  │          "I'm looking for CRM alternatives. My    │    │
│  │           need is automation workflow and CRM..." │    │
│  │                                        [Review]   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  [More signals...]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

ANIMATION SEQUENCE:
1. Activity panel collapses (350ms ease)
2. ROI panel fades in (300ms)
3. Signal cards reveal with stagger:
   - Card 1: 0ms delay
   - Card 2: 50ms delay
   - Card 3: 100ms delay
   - Card 4: 150ms delay
   - etc.
4. Each card: fade-in + slide-up (400ms ease-out)

USER MENTAL STATE:
✓ "Here are my opportunities"
✓ "I can see the value ($72K pipeline)"
✓ "High-intent leads are highlighted"
✓ Ready to take action
```

---

### 🔍 Phase 4: SIGNAL REVIEW (User-driven)

**User clicks on a signal card → Drawer opens**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Dashboard    COMPLETE: HubSpot    [7 signals | 3 🔥]      │
├─────────────────────────────────────────────────────────────┤
│  $72,450 Pipeline | 72h Saved | 1342% ROI | 7 High-Intent  │
├─────────────────────────────────────────────────────────────┤
│  ▼ Activity Log (collapsed)                                 │
├─────────────────────────────────────────────────────────────┤
│  Intent Signals (7)    │  DRAWER: Scaling Data-Driven  [×] │
│                        │                                    │
│  ┌──────────────────┐ │  Technology | SaaS | 50-200       │
│  │ [9] 🔴 Selected  │ │  Score: 9/10                       │
│  │     (Active)     │ │                                    │
│  └──────────────────┘ │  ─────────────────────────────    │
│                        │                                    │
│  ┌──────────────────┐ │  SOURCE SIGNAL                     │
│  │ [7] 🟡 Signal 2  │ │  HackerNews                        │
│  └──────────────────┘ │  news.ycombinator.com/...          │
│                        │                                    │
│  ┌──────────────────┐ │  "I'm looking for CRM alternatives │
│  │ [7] 🟡 Signal 3  │ │   My need is automation workflow   │
│  └──────────────────┘ │   and CRM. Ideally track the user  │
│                        │   activities in my app and trigger │
│  [More signals...]     │   the event..."                    │
│                        │                                    │
│                        │  PAIN POINT                        │
│                        │  [Pricing]                         │
│                        │                                    │
│                        │  ─────────────────────────────    │
│                        │                                    │
│                        │  No Battle Card yet                │
│                        │  Generate personalized outbound    │
│                        │  email and talking points          │
│                        │                                    │
│                        │  [Generate Battle Card]            │
│                        │                                    │
└─────────────────────────────────────────────────────────────┘

DRAWER FEATURES:
✓ Slides in from right (220ms ease-out)
✓ Shows complete signal details
✓ Generate battle card button
✓ Push to CRM button
✓ Find contacts button
✓ Close with × or click outside
```

---

### 📝 Phase 5: BATTLE CARD GENERATION (User-driven)

**User clicks "Generate Battle Card" → AI generates content**

```
┌─────────────────────────────────────────────────────────────┐
│                        │  DRAWER: Scaling Data-Driven  [×] │
│                        │                                    │
│                        │  Technology | SaaS | 50-200       │
│                        │  Score: 9/10                       │
│                        │                                    │
│                        │  ─────────────────────────────    │
│                        │                                    │
│                        │  OPPORTUNITY SUMMARY               │
│                        │  This prospect is actively seeking │
│                        │  CRM alternatives due to pricing   │
│                        │  concerns with HubSpot. They need  │
│                        │  automation workflow capabilities. │
│                        │                                    │
│                        │  GTM TALKING POINTS                │
│                        │  • Cost-effective alternative      │
│                        │  • Strong automation features      │
│                        │  • Easy migration from HubSpot     │
│                        │  • Flexible pricing tiers          │
│                        │                                    │
│                        │  OUTBOUND EMAIL                    │
│                        │  Subject: Better CRM automation    │
│                        │           at 40% lower cost        │
│                        │                                    │
│                        │  Hi [Name],                        │
│                        │                                    │
│                        │  I noticed you're exploring CRM    │
│                        │  alternatives to HubSpot. We help  │
│                        │  companies like yours get better   │
│                        │  automation at a fraction of the   │
│                        │  cost...                           │
│                        │                                    │
│                        │  [Copy Email]                      │
│                        │                                    │
│                        │  [Push to CRM] [Find Contacts]    │
│                        │                                    │
└─────────────────────────────────────────────────────────────┘

BATTLE CARD FEATURES:
✓ AI-generated summary
✓ Talking points for sales team
✓ Personalized email template
✓ Copy-to-clipboard functionality
✓ Push to HubSpot CRM
✓ Contact enrichment
```

---

### 📱 Mobile View Comparison

**Scanning State (Mobile):**
```
┌─────────────────────┐
│ ← Dashboard         │
│ SCANNING: HubSpot   │
├─────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━│
├─────────────────────┤
│                     │
│  🟢 Agent Activity  │
│                     │
│  • Searching...     │
│  • Scraping...      │
│  • Extracting...    │
│  • Working...       │
│                     │
│                     │
│                     │
│                     │
│                     │
│                     │
└─────────────────────┘
```

**Complete State (Mobile):**
```
┌─────────────────────┐
│ ← Dashboard         │
│ COMPLETE: HubSpot   │
├─────────────────────┤
│ $72K | 72h | 7 🔥   │
├─────────────────────┤
│ ▼ Activity Log      │
├─────────────────────┤
│ Intent Signals (7)  │
│                     │
│ ┌─────────────────┐ │
│ │ [9] 🔴          │ │
│ │ Startup         │ │
│ │ Pricing issue   │ │
│ │     [Review]    │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ [7] 🟡          │ │
│ │ SMB Team        │ │
│ │ Feature gaps    │ │
│ │     [Review]    │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘
```

---

## Animation Timing Reference

### Scanning → Complete Transition
```
Time    Event
────────────────────────────────────────────
0ms     Scan completes (done = true)
300ms   Completion badge appears
        - Slide down animation starts
        - Scale pulse animation starts
600ms   Badge fully visible
3600ms  Badge starts fading out
3900ms  Badge removed from DOM
        Activity panel collapse begins
4250ms  Activity panel collapsed
        ROI panel fade-in begins
4550ms  ROI panel visible
        Signal cards start revealing
4550ms  Card 1 fade-in starts
4600ms  Card 2 fade-in starts
4650ms  Card 3 fade-in starts
4700ms  Card 4 fade-in starts
...     (50ms stagger continues)
5000ms  All animations complete
```

### Activity Log Expand/Collapse
```
Time    Event
────────────────────────────────────────────
0ms     User clicks header
0ms     Toggle icon rotation starts
350ms   Panel fully expanded/collapsed
350ms   Toggle icon rotation complete
```

### Signal Card Hover
```
Time    Event
────────────────────────────────────────────
0ms     Mouse enters card
150ms   Lift animation complete
        Border color transition complete
```

---

## Color Coding Reference

### Status Indicators
- 🟢 **Green**: Active scanning, success, completion
- 🔴 **Red**: High-intent signals (score 8-10)
- 🟡 **Amber**: Medium-intent signals (score 6-7)
- 🟢 **Green**: Low-intent signals (score 0-5)
- 🔵 **Blue**: Information, search actions
- 🟣 **Purple**: Primary brand, active states

### Signal Sources
- 🟠 **Orange**: Reddit
- 🔵 **Blue**: LinkedIn, Job boards
- 🟣 **Pink**: G2, Capterra, review sites
- ⚪ **Gray**: Other sources

---

## Key Interaction Patterns

### Click Targets
```
Element                 Action              Result
─────────────────────────────────────────────────────────
"Run Scan" button      → Click            → Start scan
Signal card            → Click            → Open drawer
Activity log header    → Click            → Expand/collapse
Drawer close (×)       → Click            → Close drawer
"Generate Battle Card" → Click            → Generate content
"Push to CRM"          → Click            → Push to HubSpot
"Find Contacts"        → Click            → Enrich data
```

### Keyboard Shortcuts
```
Key         Context              Action
─────────────────────────────────────────────────────
Tab         Anywhere            → Navigate elements
Enter       Button focused      → Activate button
Space       Button focused      → Activate button
Escape      Drawer open         → Close drawer
Enter       Activity log header → Expand/collapse
```

---

## Success Indicators

### Visual Feedback
✓ Progress bar animates during scan
✓ Pulsing green dot shows active state
✓ Completion badge confirms success
✓ High-intent badge highlights priorities
✓ Hover effects show interactivity
✓ Active states show selection

### State Clarity
✓ Status label shows current state
✓ Layout changes reflect state
✓ Conditional elements appear/hide
✓ Animations guide attention
✓ Colors convey meaning
✓ Icons reinforce actions

---

## User Mental Model

```
BEFORE (Confused):
"What should I look at?"
"Is it done yet?"
"Are these all the results?"
"Should I wait or start reviewing?"

AFTER (Clear):
"I'm watching the agent work" (Scanning)
"It's complete! I found 7 opportunities" (Completion)
"Now I review and take action" (Results)
"I know exactly what to do next"
```

---

This visual guide demonstrates the complete progressive disclosure flow, showing how users move from scanning to completion to action with clear visual feedback at every step.
