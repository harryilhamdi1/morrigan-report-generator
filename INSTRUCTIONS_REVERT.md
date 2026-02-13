# Instructions to Apply New Scoring Logic to Old Code

After you delete your workspace and revert to the old GitHub version, follow these steps to integrate the accurate scoring logic.

## Step 1: Add Helper Functions
Open your `generate_report.js` and paste the following functions at the top (after imports):

1.  `loadSectionWeights()`
2.  `calculateWeightedScore(sectionsMap)`
3.  `parseItemScore(val)`
4.  And the `SECTION_ITEMS` constant.
*(Copy these from `scoring_logic_vFinal.js`)*

## Step 2: Update Data Processing
Inside the `processWave` function, locate the loop `records.forEach(record => { ... })`.

1.  Ensure `storeData` object has `failedItems: []` initialized.
2.  **DELETE** any existing manual score calculation logic.
3.  **PASTE** the logic block from `scoring_logic_vFinal.js` (Section 3) that handles:
    *   Item-level drill down (populating `failedItems`).
    *   Total Score calculation (preferring CSV "Final Score").

## Step 3: Run the Script
Run `node generate_report.js` as usual. The report will now use your preferred old UI but with the validated, accurate numbers.

## Optional: Display Failed Items
If you want to see the failed items in the old UI (without breaking layout), find `function loadStoreDetail()` in the HTML generation part and add this small snippet right before the "Qualitative Feedback" or "Trend Chart" section:

```javascript
var fi = cur.failedItems || [];
if (fi.length > 0) {
    // Logic to append a list of failed items to a container
    console.log("Failed items found:", fi);
}
```
*(Refer to `generate_report_v6.js` if you want the full implementation of this UI part, but logic is the priority).*
