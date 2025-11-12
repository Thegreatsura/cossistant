# Discount Troubleshooting Guide

## What I Fixed

1. **✅ Updated Sandbox Discount ID**: Changed from `eb055bb6-eb17-46c5-9944-b59b2ef2bbe0` to `5f9eb3b0-75d6-4291-851d-d40b0c7965eb` to match your Polar sandbox configuration.

2. **✅ Added Comprehensive Logging**:
   - **Server-side**: Logs discount fetch success/failure in `apps/api/src/trpc/routers/plan.ts`
   - **Client-side**: Logs discount data, validity, and loading state in the upgrade modal

3. **✅ Added Loading State**: The modal now shows a loading skeleton while fetching the discount

4. **✅ Added Debug Banner**: If the discount fails to load, a yellow debug banner will appear

## How to Test

1. **Start your development servers**:

   ```bash
   bun run dev
   ```

2. **Open the upgrade modal** by clicking "Upgrade to Hobby" on any plan page

3. **Check the console** for these logs:
   - Server log: `"Discount fetched successfully:"` or `"Failed to fetch discount:"`
   - Client log: `"Discount Debug:"` with discount data

4. **Look for visual indicators**:
   - **Loading skeleton** appears briefly while fetching
   - **Green discount banner** appears if discount is valid
   - **Yellow debug banner** appears if discount failed to load

## Expected Discount Display

When working correctly, you should see:

```
┌─────────────────────────────────────────────────┐
│ ✨ Early Bird Discount                          │
│                                                 │
│ $9 off per month for life                      │
│                                                 │
│ 🏷️  X of 150 left                               │
└─────────────────────────────────────────────────┘
```

## Troubleshooting Checklist

### 1. Check Environment

```bash
# Make sure NODE_ENV is set correctly
echo $NODE_ENV
```

- Should be empty or "development" for local testing (uses sandbox ID)
- Should be "production" for production (uses production ID)

### 2. Verify Polar Configuration

**Sandbox Discount ID**: `5f9eb3b0-75d6-4291-851d-d40b0c7965eb`

- Log into Polar sandbox
- Navigate to Discounts
- Verify the discount exists and has:
  - Name: "early bird discount" (or similar)
  - Type: Fixed amount
  - Amount: $9.00 (900 cents)
  - Duration: Forever
  - Max redemptions: 150
  - Status: Active

### 3. Check Server Logs

Look in your API terminal for:

```
✅ Success:
Discount fetched successfully: {
  id: '5f9eb3b0-75d6-4291-851d-d40b0c7965eb',
  name: 'early bird discount',
  type: 'fixed',
  amount: 900,
  redemptionsLeft: 150
}

❌ Error:
Failed to fetch discount: {
  discountId: '5f9eb3b0-75d6-4291-851d-d40b0c7965eb',
  error: 'Discount not found'
}
```

### 4. Check Browser Console

Open DevTools Console and look for:

```javascript
Discount Debug: {
  discountId: "5f9eb3b0-75d6-4291-851d-d40b0c7965eb",
  discount: {
    id: "5f9eb3b0-75d6-4291-851d-d40b0c7965eb",
    name: "early bird discount",
    amount: 900,
    type: "fixed",
    redemptionsLeft: 150,
    // ... more fields
  },
  isDiscountValid: true,
  isLoadingDiscount: false
}
```

### 5. Verify Polar API Access

Check that your `POLAR_ACCESS_TOKEN` environment variable is set:

```bash
# In apps/api/.env or root .env
POLAR_ACCESS_TOKEN=polar_sandbox_xxxxx
```

Make sure:

- The token has `discounts:read` scope
- The token is for the sandbox environment (not production)
- The token hasn't expired

### 6. Common Issues

#### Issue: "Discount not found"

**Solution**: Verify the discount ID matches exactly in Polar sandbox

#### Issue: `isDiscountValid: false`

**Possible causes**:

- Discount has expired (`endsAt` is in the past)
- Discount hasn't started yet (`startsAt` is in the future)
- All redemptions used (`redemptionsLeft: 0`)

**Check validation logic**:

```typescript
// In apps/web/src/lib/discount-utils.ts
export function isDiscountAvailable(discount: DiscountInfo): boolean {
  // Check redemptions
  if (discount.redemptionsLeft !== null && discount.redemptionsLeft <= 0) {
    return false;
  }
  // Check expiry
  if (discount.endsAt && new Date(discount.endsAt) < new Date()) {
    return false;
  }
  // Check start date
  if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
    return false;
  }
  return true;
}
```

#### Issue: Discount loads but doesn't show

- Check if `discount` is not null in console
- Check if `isDiscountValid` is true
- Verify no CSS/styling issues hiding the banner

#### Issue: Network errors

- Check if CORS is configured correctly
- Verify Polar API is accessible from your development environment
- Check browser Network tab for failed requests

## Debug Mode

The modal now includes a debug banner that will show if the discount fails to load. This helps you quickly identify issues without checking the console.

To remove debug features after troubleshooting:

1. Remove the debug logging in `upgrade-modal.tsx`:

```typescript
// Remove these lines:
if (open) {
  console.log("Discount Debug:", {
    discountId: EARLY_BIRD_DISCOUNT_ID,
    discount,
    isDiscountValid,
    isLoadingDiscount,
  });
}
```

2. Remove the debug banner:

```tsx
{
  /* Remove this section */
}
{
  !isLoadingDiscount && !discount && (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <p className="text-yellow-800 text-xs">
        Debug: Discount could not be loaded. Check console for details.
      </p>
    </div>
  );
}
```

3. Remove server-side logging in `plan.ts`:

```typescript
// Remove:
console.log("Discount fetched successfully:", {...});
console.error("Failed to fetch discount:", {...});
```

## Next Steps

1. Open the upgrade modal and check what you see
2. Look at both server and browser console logs
3. Verify the discount configuration in Polar
4. Share the console output if you need more help

The discount banner **will appear** if:

- ✅ Discount fetch succeeds
- ✅ Discount has redemptions left
- ✅ Discount hasn't expired
- ✅ Discount has started

Otherwise, you'll see the debug banner with instructions to check the console.
