# BeyondFear: Mobile-First Responsive Design Guide

> **Philosophy:** Design for mobile first, then enhance for tablet and desktop. All components should be responsive by default using Tailwind CSS.

---

## 📱 Breakpoints

```css
/* Mobile First Approach */
/* Default: < 640px (phones) - Optimize here first! */
/* sm: ≥ 640px (small tablets) */
/* md: ≥ 768px (tablets) */
/* lg: ≥ 1024px (desktops) */
/* xl: ≥ 1280px (large desktops) */
```

**Tailwind Classes:**
```jsx
// Mobile: Default (no prefix)
// Tablet: md:
// Desktop: lg:

<div className="w-full md:w-1/2 lg:w-1/3">
  Mobile: Full width
  Tablet (768px): 50% width
  Desktop (1024px): 33% width
</div>
```

---

## 🎨 Component Patterns

### Pattern 1: Full-Width Mobile → Centered Desktop

**Use Case:** Forms, cards, input areas

```jsx
<div className="w-full max-w-4xl mx-auto px-4 md:px-8">
  {/* 
    Mobile: Full width with small padding (16px)
    Desktop: Max 4xl with 32px padding (centered)
  */}
  <h1 className="text-2xl md:text-3xl lg:text-4xl">
    Heading
  </h1>
  <input className="w-full text-base md:text-lg" />
</div>
```

### Pattern 2: Stacked Mobile → Grid Desktop

**Use Case:** Dashboard cards, session list

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* 
    Mobile: 1 column (full width)
    Tablet: 2 columns
    Desktop: 3 columns
  */}
  {sessions.map(session => (
    <div key={session._id} className="p-4 border rounded">
      {session.fearTitle}
    </div>
  ))}
</div>
```

### Pattern 3: Drawer Mobile → Sidebar Desktop

**Use Case:** Navigation, filters

```jsx
const [showMenu, setShowMenu] = useState(false);

return (
  <>
    {/* Mobile: Hamburger menu */}
    <button className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
      ☰ Menu
    </button>

    {/* Drawer overlay (mobile only) */}
    {showMenu && (
      <div className="fixed inset-0 bg-black/50 md:hidden" 
           onClick={() => setShowMenu(false)} />
    )}

    {/* Navigation: Drawer (mobile) or Sidebar (desktop) */}
    <nav className={`
      fixed left-0 top-0 bottom-0 w-64 bg-white transform transition-transform
      md:static md:transform-none md:bg-transparent
      ${showMenu ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Menu items */}
    </nav>
  </>
);
```

---

## 🎯 Page-Level Layouts

### Layout 1: Session Conversation (Core Page)

**Mobile-first approach:**

```jsx
export function SessionPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header: Full width on mobile */}
      <div className="bg-blue-600 text-white p-4 md:p-6">
        <h2 className="text-lg md:text-2xl">Your Fear</h2>
        <p className="text-sm md:text-base opacity-90">Impostor Syndrome</p>
      </div>

      {/* Conversation: Scrollable middle section */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          {/* Messages */}
        </div>
      </div>

      {/* Input: Sticky bottom on mobile, fixed width desktop */}
      <div className="border-t bg-white p-4 md:p-6 max-w-4xl mx-auto w-full">
        <div className="flex gap-2">
          <input 
            type="text"
            className="flex-1 border rounded px-3 py-2 text-sm md:text-base"
            placeholder="Type your response..."
          />
          <button className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded text-sm md:text-base">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Layout 2: Dashboard (Stats Overview)

**Mobile → Desktop progression:**

```jsx
export function Dashboard() {
  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Title */}
        <h1 className="text-2xl md:text-4xl font-bold mb-6 md:mb-8">
          Your Journey
        </h1>

        {/* Stats Cards: 1 col mobile → 2 cols tablet → 4 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard label="Sessions" value="5" />
          <StatCard label="Fears Addressed" value="5" />
          <StatCard label="Avg Improvement" value="30%" />
          <StatCard label="Actions Done" value="8" />
        </div>

        {/* Chart: Full width mobile → max-width desktop */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4">
            Fear Intensity Trend
          </h2>
          <div className="w-full h-64 md:h-96">
            {/* Recharts component */}
          </div>
        </div>

        {/* Sessions List: Vertical mobile → Table-like desktop */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="hidden md:grid grid-cols-4 gap-4 p-6 bg-gray-100 font-semibold">
            <div>Fear</div>
            <div>Category</div>
            <div>Intensity</div>
            <div>Date</div>
          </div>
          
          <div className="divide-y">
            {sessions.map(session => (
              <div 
                key={session._id}
                className="p-4 md:grid md:grid-cols-4 md:gap-4 hover:bg-gray-50"
              >
                {/* Mobile: Stacked, Desktop: Grid */}
                <div>
                  <span className="md:hidden font-bold text-sm">Fear:</span>
                  {session.fearTitle}
                </div>
                <div>
                  <span className="md:hidden font-bold text-sm">Category:</span>
                  {session.fearCategory}
                </div>
                <div>
                  <span className="md:hidden font-bold text-sm">Intensity:</span>
                  {session.fearIntensity.initialScore} → {session.fearIntensity.finalScore}
                </div>
                <div>
                  <span className="md:hidden font-bold text-sm">Date:</span>
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
```

---

### Layout 3: Fear Entry Form (Modal/Full Screen)

**Mobile: Full screen, Desktop: Modal**

```jsx
export function FearEntryModal({ isOpen, onClose, onSubmit }) {
  return (
    <>
      {/* Overlay: Only show on mobile or when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Modal/Form Container */}
      <div className={`
        fixed md:absolute inset-0 md:inset-auto
        bg-white rounded-none md:rounded-lg
        p-6 md:p-8
        z-50
        
        /* Mobile: Full screen, Desktop: 600px centered */
        md:top-1/2 md:left-1/2 md:w-full md:max-w-2xl
        md:-translate-x-1/2 md:-translate-y-1/2
        
        /* Desktop shadow only */
        md:shadow-lg
      `}>
        
        {/* Close button: Only visible on mobile */}
        <button 
          className="absolute top-4 right-4 md:hidden text-2xl"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Tell Us About Your Fear
        </h2>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Fear Topic (Brief)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:outline-blue-600"
              placeholder="e.g., Impostor Syndrome"
            />
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Category
            </label>
            <select className="w-full px-4 py-2 border rounded-lg">
              <option>Career</option>
              <option>Relationships</option>
              <option>Health</option>
              <option>Personal Growth</option>
            </select>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe Your Fear
            </label>
            <textarea
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:outline-blue-600"
              placeholder="Share what you're experiencing..."
            />
          </div>

          {/* Buttons: Stack mobile, side-by-side desktop */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm md:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
            >
              Start Dialogue
            </button>
          </div>

        </form>

      </div>
    </>
  );
}
```

---

### Layout 4: Payment Checkout

**Mobile: Full screen, Desktop: Modal**

```jsx
export function PaymentModal({ amount, onClose }) {
  return (
    <div className="fixed md:absolute inset-0 bg-white md:bg-gray-100 md:rounded-lg md:shadow-lg md:max-w-md md:mx-auto md:top-1/2 md:-translate-y-1/2">
      
      {/* Close Button */}
      <button 
        className="absolute top-4 right-4 text-2xl md:text-xl"
        onClick={onClose}
      >
        ✕
      </button>

      {/* Payment Section */}
      <div className="p-6 md:p-8 space-y-6">
        
        <h2 className="text-2xl md:text-xl font-bold">
          Unlock BeyondFear Premium
        </h2>

        {/* Price */}
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <p className="text-gray-600 text-sm md:text-base">Monthly Plan</p>
          <p className="text-4xl md:text-3xl font-bold text-blue-600">
            ₹{(amount / 100).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ✓ Unlimited sessions<br/>
            ✓ Full analytics<br/>
            ✓ Export reports
          </p>
        </div>

        {/* Razorpay Button: Full width */}
        <button
          onClick={handlePayment}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-base"
        >
          Pay Now with Razorpay
        </button>

        {/* Secure badge */}
        <div className="text-center text-xs md:text-sm text-gray-500">
          🔒 Secured by Razorpay | No card saved
        </div>

      </div>

    </div>
  );
}
```

---

## 🧩 Reusable Component Snippets

### StatCard (Responsive)

```jsx
function StatCard({ label, value, trend }) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow hover:shadow-md transition">
      <p className="text-gray-600 text-xs md:text-sm font-medium uppercase">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-bold mt-2 md:mt-3">
        {value}
      </p>
      {trend && (
        <p className={`text-xs md:text-sm mt-2 ${
          trend > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </p>
      )}
    </div>
  );
}
```

---

### Button Variants (Responsive)

```jsx
// Primary Button
<button className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white text-sm md:text-base rounded-lg hover:bg-blue-700">
  Action
</button>

// Secondary Button
<button className="px-4 md:px-6 py-2 md:py-3 border border-gray-300 text-sm md:text-base rounded-lg hover:bg-gray-50">
  Cancel
</button>

// Full-width Button (Mobile)
<button className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg">
  Submit
</button>
```

---

### Message Bubble (Conversation)

```jsx
<div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
  <div className={`
    max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg text-sm md:text-base
    ${message.role === 'user' 
      ? 'bg-blue-600 text-white rounded-br-none' 
      : 'bg-gray-200 text-gray-900 rounded-bl-none'
    }
  `}>
    {message.content}
  </div>
</div>
```

---

## 📏 Typography (Responsive)

```jsx
// Headings
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold" />
<h2 className="text-xl md:text-2xl lg:text-3xl font-bold" />
<h3 className="text-lg md:text-xl lg:text-2xl font-semibold" />

// Body
<p className="text-sm md:text-base lg:text-lg text-gray-700" />

// Small
<span className="text-xs md:text-sm text-gray-500" />
```

---

## 🛡️ Testing Mobile Responsiveness

### Browser DevTools (Chrome/Firefox)

1. Open DevTools: `F12`
2. Click device icon (top-left)
3. Select device or custom size:
   - **Mobile:** 375×667 (iPhone 8)
   - **Tablet:** 768×1024 (iPad)
   - **Desktop:** 1920×1080

### Real Devices

- **Test on physical phone** if possible
- Use Chrome remote debugging for Android
- Use Safari on Mac for iOS testing

### Checklist

- [ ] Mobile (375px): All elements fit, no horizontal scroll
- [ ] Tablet (768px): Layout adapts, readable text
- [ ] Desktop (1024px+): Full-width not awkward, spacing balanced
- [ ] Touch targets: Buttons ≥ 44×44px (mobile)
- [ ] Text: Readable without pinch-zoom
- [ ] Images: Responsive, not stretched
- [ ] Scrolling: Smooth, no jank

---

## 🎬 Common Patterns

### Show/Hide by Screen Size

```jsx
{/* Show only on mobile */}
<div className="md:hidden">Mobile Content</div>

{/* Show only on desktop */}
<div className="hidden md:block">Desktop Content</div>

{/* Show on tablet and up */}
<div className="hidden md:block">Tablet+ Content</div>
```

---

### Padding Progression

```jsx
{/* Compact mobile, generous desktop */}
<div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 lg:py-12">
  Content
</div>
```

---

### Flex vs Grid

```jsx
{/* Stack on mobile, side-by-side on desktop */}
<div className="flex flex-col md:flex-row gap-4">
  <div>Left</div>
  <div>Right</div>
</div>

{/* 1-col mobile, 2-col tablet, 3-col desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

---

## ✅ Responsive Design Checklist

- [ ] Design mobile first (default styles for < 640px)
- [ ] Use Tailwind breakpoints (`md:`, `lg:`)
- [ ] Max-width on desktop (usually `max-w-4xl` or `max-w-6xl`)
- [ ] Padding scales: `px-4 md:px-8`
- [ ] Typography scales: `text-xl md:text-2xl`
- [ ] Buttons/inputs: Touch-friendly (≥ 44×44px)
- [ ] No horizontal scrolling on mobile
- [ ] Test on real phone + tablet
- [ ] Use `h-screen` or `h-full` for full-height layouts
- [ ] Sticky elements work on mobile (bottom input bar)

---

**This guide ensures BeyondFear looks great on all screen sizes!** 📱💻

