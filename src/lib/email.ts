import emailjs from "@emailjs/browser";

const SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL         || "";

/* ─────────────────────────────────────
   Generic send
───────────────────────────────────── */
async function send(params: Record<string, string>) {
  if (!PUBLIC_KEY || PUBLIC_KEY === "your_public_key") return; // not configured yet
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);
  } catch (e) {
    console.warn("EmailJS send failed:", e);
  }
}

/* ─────────────────────────────────────
   RENTAL BOOKED
   → user confirmation
   → admin notification
───────────────────────────────────── */
export async function emailRentalBooked(params: {
  userEmail: string;
  userName: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  totalPrice: string;
  rentalId: string;
}) {
  // Email to customer
  await send({
    to_email:     params.userEmail,
    to_name:      params.userName,
    subject:      `✅ Rental Confirmed — ${params.vehicleName}`,
    message: `
Hello ${params.userName},

Your rental booking has been confirmed on DriveEasy!

🚗 Vehicle:   ${params.vehicleName}
📅 From:      ${params.startDate}
📅 To:        ${params.endDate}
💰 Total:     ${params.totalPrice} FCFA
🔖 Ref:       ${params.rentalId.slice(0, 8).toUpperCase()}

Our team in Buea will contact you to arrange pickup.
Thank you for choosing DriveEasy — Cameroon's premier car platform.

DriveEasy Team · Buea, Cameroon
    `.trim(),
  });

  // Email to admin
  await send({
    to_email:  ADMIN_EMAIL,
    to_name:   "DriveEasy Admin",
    subject:   `🆕 New Rental — ${params.vehicleName}`,
    message: `
New rental booking received!

Customer:   ${params.userName} (${params.userEmail})
Vehicle:    ${params.vehicleName}
Dates:      ${params.startDate} → ${params.endDate}
Total:      ${params.totalPrice} FCFA
Ref:        ${params.rentalId.slice(0, 8).toUpperCase()}

Please log in to the Admin Dashboard to manage this booking.
    `.trim(),
  });
}

/* ─────────────────────────────────────
   VEHICLE PURCHASED
───────────────────────────────────── */
export async function emailVehiclePurchased(params: {
  userEmail: string;
  userName: string;
  vehicleName: string;
  salePrice: string;
  saleId: string;
}) {
  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `🎉 Purchase Confirmed — ${params.vehicleName}`,
    message: `
Hello ${params.userName},

Congratulations! Your vehicle purchase is confirmed on DriveEasy.

🚗 Vehicle:   ${params.vehicleName}
💰 Price:     ${params.salePrice} FCFA
🔖 Ref:       ${params.saleId.slice(0, 8).toUpperCase()}

Our team will contact you shortly to arrange the vehicle handover in Buea.
Thank you for choosing DriveEasy!

DriveEasy Team · Buea, Cameroon
    `.trim(),
  });

  await send({
    to_email: ADMIN_EMAIL,
    to_name:  "DriveEasy Admin",
    subject:  `💰 New Sale — ${params.vehicleName}`,
    message: `
New vehicle sale recorded!

Customer:   ${params.userName} (${params.userEmail})
Vehicle:    ${params.vehicleName}
Price:      ${params.salePrice} FCFA
Ref:        ${params.saleId.slice(0, 8).toUpperCase()}

Please arrange the handover with the customer.
    `.trim(),
  });
}

/* ─────────────────────────────────────
   RENTAL STATUS CHANGED (by admin)
───────────────────────────────────── */
export async function emailRentalStatusChanged(params: {
  userEmail: string;
  userName: string;
  vehicleName: string;
  newStatus: string;
  rentalId: string;
}) {
  const messages: Record<string, string> = {
    active:    "Your rental is now ACTIVE. The vehicle is ready for you.",
    completed: "Your rental has been marked COMPLETED. Thank you for using DriveEasy!",
    cancelled: "Your rental has been CANCELLED. Contact us if this was unexpected.",
  };

  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `📋 Rental Update — ${params.vehicleName}`,
    message: `
Hello ${params.userName},

Your rental status has been updated.

🚗 Vehicle:   ${params.vehicleName}
📌 Status:    ${params.newStatus.toUpperCase()}
🔖 Ref:       ${params.rentalId.slice(0, 8).toUpperCase()}

${messages[params.newStatus] || ""}

DriveEasy Team · Buea, Cameroon
    `.trim(),
  });
}

/* ─────────────────────────────────────
   RENTAL CANCELLED BY USER
───────────────────────────────────── */
export async function emailRentalCancelled(params: {
  userEmail: string;
  userName: string;
  vehicleName: string;
  rentalId: string;
}) {
  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `❌ Rental Cancelled — ${params.vehicleName}`,
    message: `
Hello ${params.userName},

Your rental has been cancelled as requested.

🚗 Vehicle:   ${params.vehicleName}
🔖 Ref:       ${params.rentalId.slice(0, 8).toUpperCase()}

If you need to make a new booking, visit driveeasy.cm

DriveEasy Team · Buea, Cameroon
    `.trim(),
  });

  await send({
    to_email: ADMIN_EMAIL,
    to_name:  "DriveEasy Admin",
    subject:  `❌ Rental Cancelled by ${params.userName}`,
    message:  `${params.userName} (${params.userEmail}) cancelled rental for ${params.vehicleName}. Ref: ${params.rentalId.slice(0, 8).toUpperCase()}`,
  });
}
