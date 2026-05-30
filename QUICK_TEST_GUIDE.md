# Quick Test Guide - Sequential Node Animation

## ⚡ Fast Testing Steps

### 1. Start Frontend
```bash
cd frontend
npm run dev
```

### 2. Open Browser Console (F12)
Keep the Console tab visible

### 3. Start a Scan
Click "Start Scan" button

### 4. Watch for Sequential Animation

#### ✅ SUCCESS - You should see:
- Node 1 lights up (purple glow)
- **1 second pause**
- Node 1 turns green, Node 2 lights up
- **1 second pause**
- Node 2 turns green, Node 3 lights up
- **1 second pause**
- Node 3 turns green, Node 4 lights up
- **1 second pause**
- Node 4 turns green, Node 5 lights up
- **1 second pause**
- Node 5 turns green, Node 6 lights up

#### ❌ FAILURE - If you see:
- Nodes 3, 4, 5, 6 all light up at once (batch rendering)
- No visible pause between activations
- Nodes skip or jump

## 🔍 Console Output to Look For

### Good Pattern (Sequential):
```
🔄 Resetting scan progress
🔍 Stage Debug: { currentStage: 0, visibleStage: 0, activityCount: 0 }
⏱️ Scheduling transition: 0 → 1
✅ Stage transition complete: 0 → 1
⏱️ Scheduling transition: 1 → 2
✅ Stage transition complete: 1 → 2
⏱️ Scheduling transition: 2 → 3
✅ Stage transition complete: 2 → 3
```
**Note**: Each "✅ Stage transition complete" should be ~1 second apart

### Bad Pattern (Batch):
```
⏱️ Scheduling transition: 2 → 3
✅ Stage transition complete: 2 → 3
✅ Stage transition complete: 3 → 4
✅ Stage transition complete: 4 → 5
✅ Stage transition complete: 5 → 6
```
**Note**: Multiple completions at the same time = batch rendering

## 🛠️ If Still Not Working

### Quick Fix #1: Increase Delay
Edit `frontend/src/pages/Dashboard.jsx` line ~130:
```javascript
}, 1000);  // Change to 1500 or 2000
```

### Quick Fix #2: Check Backend Speed
If backend completes too fast, add delays in `backend/main.py`:
```python
import asyncio
await asyncio.sleep(2)  # After each stage
```

### Quick Fix #3: Hard Refresh
- Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## 📊 What Changed

| Aspect | Before | After |
|--------|--------|-------|
| Delay | 600ms | 1000ms |
| Debug Logs | None | 4 types |
| Scanning Guard | No | Yes |
| Unused Code | lastStageRef | Removed |

## 📁 Files Modified
- `frontend/src/pages/Dashboard.jsx` (lines 87-135)

## 📚 Full Documentation
- `SEQUENTIAL_FIX_SUMMARY.md` - Complete implementation details
- `SEQUENTIAL_NODE_DEBUG.md` - Detailed debugging guide
