# Testing Guide - Progressive Disclosure Implementation

## Quick Start Testing

### Prerequisites
```bash
# Ensure dependencies are installed
cd frontend
npm install

# Start the development server
npm run dev
```

### Backend Setup
```bash
# In a separate terminal
cd backend
python -m uvicorn main:app --port 8000 --reload
```

---

## Test Scenarios

### 1. **Scanning State Test**

**Objective:** Verify the scanning state displays correctly with focused activity panel.

**Steps:**
1. Navigate to Dashboard
2. Enter a competitor name (e.g., "Salesforce")
3. Click "Run Scan"

**Expected Results:**
- ✅ Status label changes to "SCANNING"
- ✅ Activity panel takes full width
- ✅ Progress bar animates
- ✅ Stats show: searches, scrapes, tool calls
- ✅ Intent Signals panel is hidden
- ✅ ROI panel is hidden
- ✅ Activity items appear in real-time
- ✅ Pulsing green dot next to "Agent Activity"

**Visual Check:**
```
┌─────────────────────────────────────────┐
│ SCANNING: Salesforce    [3 / 7 / 12]    │
├─────────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Animated
├─────────────────────────────────────────┤
│     🟢 Agent Activity (FULL WIDTH)       │
│     • MCP signal: Searching...          │
│     • search_web(...)                   │
└─────────────────────────────────────────┘
```

---

### 2. **Completion Transition Test**

**Objective:** Verify smooth transition from scanning to complete state.

**Steps:**
1. Continue from Test 1 (wait for scan to complete)
2. Observe the transition

**Expected Results:**
- ✅ Completion badge appears at top center
- ✅ Badge shows: "✓ Scan Complete — X opportunities found"
- ✅ Badge has green gradient background
- ✅ Badge auto-dismisses after 3 seconds
- ✅ Status label changes to "COMPLETE"
- ✅ Activity panel collapses smoothly
- ✅ Results panel fades in
- ✅ ROI panel appears
- ✅ Signal cards reveal with stagger effect

**Timing Check:**
- Completion badge appears: ~300ms after scan ends
- Badge duration: 3 seconds
- Panel transition: ~350ms
- Card stagger: 50ms per card

---

### 3. **Complete State Test**

**Objective:** Verify the complete state displays results prominently.

**Steps:**
1. Continue from Test 2 (after transition completes)
2. Review the layout

**Expected Results:**
- ✅ Status label shows "COMPLETE"
- ✅ Stats bar shows: signals count, high-intent badge
- ✅ ROI panel visible with 4 metrics
- ✅ Activity log collapsed to header only
- ✅ Intent Signals panel takes full width
- ✅ Signal cards sorted by score (highest first)
- ✅ High-intent badge visible if applicable
- ✅ All cards have smooth entrance animation

**Visual Check:**
```
┌─────────────────────────────────────────┐
│ COMPLETE: Salesforce  [7 signals | 3 🔥]│
├─────────────────────────────────────────┤
│ $72K | 72h | 1342% ROI | 7 High-Intent  │
├─────────────────────────────────────────┤
│ ▼ Activity Log (collapsed)              │
├─────────────────────────────────────────┤
│ Intent Signals (7)    [3 high-intent]   │
│ [Signal cards displayed...]             │
└─────────────────────────────────────────┘
```

---

### 4. **Activity Log Expansion Test**

**Objective:** Verify activity log can be expanded/collapsed in complete state.

**Steps:**
1. Continue from Test 3
2. Click on "Activity Log" header
3. Click again to collapse

**Expected Results:**
- ✅ Header is clickable (cursor changes)
- ✅ Hover effect on header
- ✅ Toggle icon rotates on expand
- ✅ Activity feed slides down smoothly
- ✅ All activity items visible when expanded
- ✅ Clicking again collapses the log
- ✅ Toggle icon rotates back

**Keyboard Test:**
- ✅ Tab to activity log header
- ✅ Press Enter or Space to toggle
- ✅ Focus visible on header

---

### 5. **Signal Card Interaction Test**

**Objective:** Verify signal cards are interactive and display correctly.

**Steps:**
1. Continue from Test 3
2. Hover over a signal card
3. Click on a signal card
4. Close the drawer

**Expected Results:**
- ✅ Hover: Card lifts slightly (translateY -2px)
- ✅ Hover: Border color changes
- ✅ Click: Card highlights with purple border
- ✅ Click: Drawer slides in from right
- ✅ Drawer shows signal details
- ✅ Close button works
- ✅ Clicking outside closes drawer

---

### 6. **New Scan Test**

**Objective:** Verify starting a new scan resets state correctly.

**Steps:**
1. Continue from Test 5
2. Enter a new competitor name in topbar search
3. Click "Scan"

**Expected Results:**
- ✅ State resets to "scanning"
- ✅ Previous results cleared
- ✅ Activity panel expands to full width
- ✅ Activity log cleared
- ✅ Stats reset to 0
- ✅ New scan starts immediately

---

### 7. **Mobile Responsive Test**

**Objective:** Verify layout works on mobile devices.

**Steps:**
1. Open browser DevTools
2. Toggle device toolbar (mobile view)
3. Test iPhone 12 Pro (390x844)
4. Run a scan

**Expected Results:**
- ✅ Single column layout
- ✅ Topbar wraps appropriately
- ✅ Stats bar hidden on mobile
- ✅ Activity panel full width
- ✅ Signal cards stack vertically
- ✅ Drawer opens full screen
- ✅ Completion badge positioned correctly
- ✅ All touch targets ≥44px

**Test Devices:**
- iPhone 12 Pro (390x844)
- iPad Air (820x1180)
- Samsung Galaxy S21 (360x800)

---

### 8. **Accessibility Test**

**Objective:** Verify accessibility features work correctly.

**Steps:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate with keyboard only
3. Enable reduced motion in OS settings

**Expected Results:**

**Screen Reader:**
- ✅ Status changes announced
- ✅ "Scan complete" announced
- ✅ Signal count announced
- ✅ All buttons have labels
- ✅ Drawer close button labeled

**Keyboard Navigation:**
- ✅ Tab through all interactive elements
- ✅ Focus visible on all elements
- ✅ Enter/Space activates buttons
- ✅ Escape closes drawer
- ✅ No keyboard traps

**Reduced Motion:**
- ✅ All animations disabled
- ✅ State transitions instant
- ✅ Functionality preserved
- ✅ No motion sickness triggers

---

### 9. **Performance Test**

**Objective:** Verify smooth performance with many signals.

**Steps:**
1. Scan a competitor with many results (>20 signals)
2. Monitor browser performance
3. Check animation smoothness

**Expected Results:**
- ✅ Smooth 60fps animations
- ✅ No layout thrashing
- ✅ Staggered card reveal doesn't lag
- ✅ Scrolling is smooth
- ✅ Memory usage stable
- ✅ No console errors

**Performance Metrics:**
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1
- Frame rate: 60fps

---

### 10. **Edge Cases Test**

**Objective:** Verify handling of edge cases.

**Test Cases:**

**A. No Results Found**
- Scan completes with 0 signals
- ✅ Shows "No signals found" message
- ✅ Suggests trying different competitor
- ✅ No completion badge (or adjusted message)

**B. Scan Error**
- Network error during scan
- ✅ Error message in activity feed
- ✅ State remains in scanning
- ✅ User can retry

**C. Very Long Competitor Name**
- Enter 50+ character name
- ✅ Name truncates with ellipsis
- ✅ Layout doesn't break
- ✅ Tooltip shows full name

**D. Rapid Scan Switching**
- Start scan, immediately start another
- ✅ Previous scan aborts
- ✅ New scan starts cleanly
- ✅ No state conflicts

**E. Browser Back Button**
- Navigate away and back
- ✅ State preserved or reset appropriately
- ✅ No broken UI

---

## Browser Compatibility Testing

### Required Browsers
- ✅ Chrome 90+ (Windows, macOS, Linux)
- ✅ Firefox 88+ (Windows, macOS, Linux)
- ✅ Safari 14+ (macOS, iOS)
- ✅ Edge 90+ (Windows)

### Features to Verify
- CSS Grid layout
- CSS Animations
- Backdrop-filter (with fallback)
- Flexbox
- CSS Variables
- Media queries

---

## Automated Testing (Future)

### Unit Tests
```javascript
describe('ScanWorkspace', () => {
  it('should start in idle state', () => {
    // Test initial state
  });
  
  it('should transition to scanning state on scan start', () => {
    // Test state transition
  });
  
  it('should show completion badge on scan complete', () => {
    // Test completion
  });
  
  it('should collapse activity log in complete state', () => {
    // Test collapse
  });
});
```

### Integration Tests
```javascript
describe('Dashboard Flow', () => {
  it('should complete full scan workflow', async () => {
    // 1. Enter competitor
    // 2. Start scan
    // 3. Wait for completion
    // 4. Verify results displayed
  });
});
```

### E2E Tests (Playwright/Cypress)
```javascript
test('Progressive disclosure flow', async ({ page }) => {
  await page.goto('/dashboard');
  await page.fill('[placeholder*="competitor"]', 'Salesforce');
  await page.click('button:has-text("Run Scan")');
  
  // Verify scanning state
  await expect(page.locator('.workspace-body')).toHaveClass(/scanning/);
  
  // Wait for completion
  await page.waitForSelector('.completion-badge');
  
  // Verify complete state
  await expect(page.locator('.workspace-body')).toHaveClass(/complete/);
});
```

---

## Bug Reporting Template

```markdown
### Bug Report

**Title:** [Brief description]

**Environment:**
- Browser: [Chrome 120.0]
- OS: [Windows 11]
- Screen size: [1920x1080]
- Device: [Desktop/Mobile]

**Steps to Reproduce:**
1. Navigate to Dashboard
2. Click "Run Scan"
3. [Additional steps...]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Paste any console errors]

**Additional Context:**
[Any other relevant information]
```

---

## Success Criteria

### Must Pass
- ✅ All 10 test scenarios pass
- ✅ No console errors
- ✅ Smooth 60fps animations
- ✅ Keyboard navigation works
- ✅ Screen reader compatible
- ✅ Mobile responsive
- ✅ Works in all required browsers

### Nice to Have
- ⭐ Performance metrics exceed targets
- ⭐ Zero accessibility violations
- ⭐ User feedback positive
- ⭐ No edge case issues

---

## Testing Checklist

```
□ Scanning state displays correctly
□ Completion badge appears and dismisses
□ Transition to complete state is smooth
□ Activity log collapses in complete state
□ Activity log can be expanded/collapsed
□ Signal cards display with stagger effect
□ Signal cards are interactive
□ Drawer opens and closes correctly
□ New scan resets state properly
□ Mobile layout works correctly
□ Keyboard navigation functional
□ Screen reader announces changes
□ Reduced motion respected
□ Performance is smooth (60fps)
□ No console errors
□ Works in Chrome
□ Works in Firefox
□ Works in Safari
□ Works in Edge
□ Edge cases handled gracefully
```

---

## Next Steps After Testing

1. **Document Issues:** Log any bugs found
2. **Gather Feedback:** Share with team for UX feedback
3. **Performance Audit:** Run Lighthouse audit
4. **Accessibility Audit:** Run axe DevTools
5. **User Testing:** Conduct user acceptance testing
6. **Iterate:** Make improvements based on feedback
7. **Deploy:** Push to production when ready

---

## Support

If you encounter issues during testing:
1. Check browser console for errors
2. Verify backend is running
3. Check network tab for API failures
4. Review implementation docs
5. Contact development team

**Happy Testing! 🚀**
