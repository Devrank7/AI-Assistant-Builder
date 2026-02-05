#!/usr/bin/env npx ts-node
/**
 * Daily Payment Check CRON Job
 * 
 * Run with: npx ts-node scripts/checkPayments.ts
 * Or add to cron: 0 9 * * * cd /path/to/AIWidget && npx ts-node scripts/checkPayments.ts
 * 
 * This script:
 * 1. Sends reminders 3 days before payment
 * 2. Checks for failed payments past grace period
 * 3. Suspends clients who haven't paid
 * 
 * Note: Set environment variables before running
 */

import mongoose from 'mongoose';
import Client from '../src/models/Client';
import { PaymentService, getPaymentService } from '../src/lib/PaymentService';
import { REMINDER_DAYS_BEFORE, TRIAL_DAYS } from '../src/lib/paymentProviders/types';
import {
    sendPaymentReminder,
    sendSuspensionNotice,
} from '../src/lib/notifications';

const MONGODB_URI = process.env.MONGODB_URI || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourapp.com';

async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    }
}

async function checkPayments() {
    await connectDB();
    const now = new Date();
    const paymentService = getPaymentService();

    console.log(`\n=== Payment Check: ${now.toISOString()} ===\n`);

    // 1. Set initial nextPaymentDate for trial clients who don't have one
    const trialClientsWithoutPaymentDate = await Client.find({
        subscriptionStatus: 'trial',
        nextPaymentDate: null,
    });

    for (const client of trialClientsWithoutPaymentDate) {
        const nextPaymentDate = PaymentService.calculateFirstPaymentDate(client.startDate);
        await Client.updateOne(
            { _id: client._id },
            { nextPaymentDate }
        );
        console.log(`Set payment date for ${client.clientId}: ${nextPaymentDate}`);
    }

    // 2. Send reminders for payments due in REMINDER_DAYS_BEFORE days
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS_BEFORE);

    const clientsNeedingReminder = await Client.find({
        isActive: true,
        subscriptionStatus: { $in: ['trial', 'active'] },
        nextPaymentDate: {
            $lte: reminderDate,
            $gt: now,
        },
    });

    console.log(`Clients needing reminder: ${clientsNeedingReminder.length}`);

    for (const client of clientsNeedingReminder) {
        const daysUntil = PaymentService.getDaysUntilPayment(client.nextPaymentDate!);
        const paymentUrl = client.paymentMethod
            ? 'Payment will be processed automatically'
            : `${BASE_URL}/admin/client/${client.clientId}?tab=billing`;

        await sendPaymentReminder(
            client.email,
            client.telegram || undefined,
            daysUntil,
            paymentUrl
        );

        console.log(`Sent reminder to ${client.email} (${daysUntil} days)`);
    }

    // 3. Check for clients past grace period -> suspend
    const clientsPastGracePeriod = await Client.find({
        subscriptionStatus: 'past_due',
        gracePeriodEnd: { $lt: now },
        isActive: true,
    });

    console.log(`Clients past grace period: ${clientsPastGracePeriod.length}`);

    for (const client of clientsPastGracePeriod) {
        await paymentService.suspendClient(client.clientId);

        const reactivateUrl = `${BASE_URL}/admin/client/${client.clientId}?tab=billing`;
        await sendSuspensionNotice(
            client.email,
            client.telegram || undefined,
            reactivateUrl
        );

        console.log(`Suspended: ${client.clientId}`);
    }

    // 4. Check for trial clients whose trial just ended without payment method
    const trialEndedWithoutPayment = await Client.find({
        subscriptionStatus: 'trial',
        paymentMethod: null,
        nextPaymentDate: { $lt: now },
        isActive: true,
    });

    console.log(`Trial ended without payment: ${trialEndedWithoutPayment.length}`);

    for (const client of trialEndedWithoutPayment) {
        // Set to past_due with grace period
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        await Client.updateOne(
            { _id: client._id },
            {
                subscriptionStatus: 'past_due',
                gracePeriodEnd,
            }
        );

        const paymentUrl = `${BASE_URL}/admin/client/${client.clientId}?tab=billing`;
        await sendPaymentReminder(
            client.email,
            client.telegram || undefined,
            0,
            paymentUrl
        );

        console.log(`Trial ended, grace period started: ${client.clientId}`);
    }

    console.log('\n=== Payment Check Complete ===\n');
}

// Run the check
checkPayments()
    .then(() => {
        console.log('Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
