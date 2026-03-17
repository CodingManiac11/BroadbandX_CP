/**
 * fixBillingDates.js — Fix billing dates using 30-day cycles
 *
 * Monthly plan = exactly 30 days per cycle.
 * Correct endDate = startDate + (N * 30 days), where N is the
 * smallest integer such that the result is in the future.
 *
 * Usage:
 *   node scripts/fixBillingDates.js            # Dry-run
 *   node scripts/fixBillingDates.js --apply    # Apply fixes
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
require('../models/Plan');
require('../models/User');

const DRY_RUN = !process.argv.includes('--apply');
const CYCLE_DAYS = 30;

async function main() {
  console.log('');
  console.log('====================================================');
  console.log('  BroadbandX — Billing Date Fix (30-day cycles)');
  console.log(`  Mode: ${DRY_RUN ? 'DRY-RUN (no changes)' : 'APPLY (writing to DB)'}`);
  console.log('====================================================');
  console.log('');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const now = new Date();

  const subs = await Subscription.find({
    status: { $in: ['active', 'grace_period'] },
    billingCycle: 'monthly'
  }).populate('user', 'firstName lastName email').populate('plan', 'name');

  console.log(`Found ${subs.length} active monthly subscription(s).\n`);

  let fixedCount = 0;

  for (const sub of subs) {
    const startDate = new Date(sub.startDate);
    const storedEnd = new Date(sub.endDate);

    // Calculate correct endDate: startDate + N*30, smallest N where result > now
    let cycles = 1;
    let correctEnd = new Date(startDate.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000);
    while (correctEnd <= now) {
      cycles++;
      correctEnd = new Date(startDate.getTime() + cycles * CYCLE_DAYS * 24 * 60 * 60 * 1000);
    }

    const name = sub.user
      ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() || sub.user.email
      : sub._id.toString();

    const storedDays = Math.round((storedEnd - startDate) / (1000 * 60 * 60 * 24));
    const correctDays = cycles * CYCLE_DAYS;
    const isWrong = Math.abs(storedEnd.getTime() - correctEnd.getTime()) > 12 * 60 * 60 * 1000; // >12hr diff

    if (isWrong) {
      fixedCount++;
      console.log(`WRONG: ${name}`);
      console.log(`  Plan     : ${sub.plan?.name || '?'}`);
      console.log(`  Start    : ${startDate.toDateString()}`);
      console.log(`  Stored   : ${storedEnd.toDateString()} (${storedDays}d from start)`);
      console.log(`  Correct  : ${correctEnd.toDateString()} (cycle #${cycles}, ${correctDays}d from start)`);

      if (!DRY_RUN) {
        await Subscription.updateOne(
          { _id: sub._id },
          {
            $set: {
              endDate: correctEnd,
              'autoRenewal.nextRenewalDate': correctEnd
            }
          }
        );
        console.log(`  FIXED!`);
      }
      console.log('');
    } else {
      console.log(`OK: ${name} — end: ${storedEnd.toDateString()} (${storedDays}d, cycle #${cycles})`);
    }
  }

  console.log('');
  console.log('====================================================');
  console.log(`  Checked: ${subs.length}  |  Need fix: ${fixedCount}`);
  if (DRY_RUN && fixedCount > 0) {
    console.log(`  Run with --apply to fix these.`);
  }
  console.log('====================================================');

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
