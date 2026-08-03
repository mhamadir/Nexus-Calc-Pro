import { TelegramConfig, PaymentDetails } from '../types';

export async function sendTelegramPaymentNotification(
  config: TelegramConfig,
  userEmail: string,
  userUid: string,
  payment: PaymentDetails
): Promise<{ success: boolean; message?: string }> {
  if (!config.botToken || !config.chatId) {
    console.warn('Telegram Bot Token or Chat ID not configured');
    return { success: false, message: 'Telegram Bot Token or Chat ID is not configured in settings' };
  }

  const messageText = `
🚨 <b>NEW PAYMENT SUBMISSION</b>

👤 <b>Full Name:</b> ${payment.fullName}
📧 <b>Gmail:</b> ${userEmail}
💳 <b>Payment Method:</b> ${payment.paymentMethod}
🆔 <b>Transaction ID:</b> <code>${payment.transactionId}</code>
📅 <b>Date & Time:</b> ${payment.dateTime}
🔑 <b>User UID:</b> <code>${userUid}</code>

<i>Please select an action to verify or restrict access:</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve:${userUid}` },
        { text: '🚫 Reject / Block', callback_data: `block:${userUid}` }
      ]
    ]
  };

  try {
    // Attempt 1: Via backend API proxy
    const response = await fetch('/api/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken,
        chatId: config.chatId,
        text: messageText,
        uid: userUid,
        replyMarkup: inlineKeyboard
      })
    });

    if (response.ok) {
      return { success: true };
    }

    // Attempt 2: Direct browser client call as fallback
    const directUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const directRes = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    const directData = await directRes.json();
    if (directData.ok) {
      return { success: true };
    } else {
      return { success: false, message: directData.description || 'Telegram API error' };
    }
  } catch (err: any) {
    console.error('Failed to send Telegram payload:', err);
    return { success: false, message: err.message || 'Network error sending to Telegram' };
  }
}

export async function sendTelegramSecurityBlockAlert(
  config: TelegramConfig,
  userEmail: string,
  displayName: string,
  userUid: string
): Promise<{ success: boolean; message?: string }> {
  if (!config.botToken || !config.chatId) {
    console.warn('Telegram Bot Token or Chat ID not configured');
    return { success: false, message: 'Telegram Bot Token or Chat ID is not configured in settings' };
  }

  const messageText = `
🚨 <b>SECURITY ALERT: User ${userEmail} auto-blocked after 3 unauthorized device access attempts.</b>

👤 <b>Full Name:</b> ${displayName || 'Google User'}
📧 <b>Google Email:</b> ${userEmail}
🔑 <b>User UID:</b> <code>${userUid}</code>
🔒 <b>Security Status:</b> Account Automatically Blocked (Multi-Device Protection)

<i>Tap below to unblock user & reset registered device fingerprint:</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '🔓 Unblock & Reset Device', callback_data: `unblock:${userUid}` }
      ]
    ]
  };

  try {
    const response = await fetch('/api/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken,
        chatId: config.chatId,
        text: messageText,
        uid: userUid,
        replyMarkup: inlineKeyboard
      })
    });

    if (response.ok) {
      return { success: true };
    }

    // Direct client fallback
    const directUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const directRes = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    const directData = await directRes.json();
    return { success: directData.ok, message: directData.description };
  } catch (err: any) {
    console.error('Failed to send Telegram security block alert:', err);
    return { success: false, message: err.message || 'Network error sending to Telegram' };
  }
}

