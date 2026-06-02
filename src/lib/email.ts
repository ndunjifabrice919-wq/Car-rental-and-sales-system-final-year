import emailjs from "@emailjs/browser";

const SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL         || "";

/* ─────────────────────────────────────
   Base HTML Template Wrapper
───────────────────────────────────── */
function getHtmlTemplate(title: string, bodyContent: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a202c; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">DriveEasy</h1>
              <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 14px;">Premium Car Rental & Sales</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 22px; font-weight: 600;">${title}</h2>
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #a0aec0;">&copy; ${new Date().getFullYear()} DriveEasy Team. All rights reserved.</p>
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">Buea, South West Region, Cameroon</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─────────────────────────────────────
   Generic send
───────────────────────────────────── */
async function send(params: Record<string, string>) {
  if (!PUBLIC_KEY || PUBLIC_KEY === "your_public_key") return;
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);
  } catch (e) {
    console.warn("EmailJS send failed:", e);
  }
}

/* ─────────────────────────────────────
   TWO-STEP VERIFICATION CODE
───────────────────────────────────── */
export async function emailVerificationCode(params: {
  userEmail: string;
  userName: string;
  code: string;
}): Promise<boolean> {
  if (!PUBLIC_KEY || PUBLIC_KEY === "your_public_key") return false;

  const html = getHtmlTemplate("Secure Sign-In", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      Hello <strong>${params.userName}</strong>,<br><br>
      Please use the verification code below to complete your sign-in to DriveEasy. This code is valid for <strong>10 minutes</strong>.
    </p>
    <div style="background-color: #ebf4ff; border: 1px solid #c3dafe; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
      <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2b6cb0;">${params.code}</span>
    </div>
    <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: #718096;">
      <strong>Security tip:</strong> Never share this code with anyone. Our team will never ask you for your code.
    </p>
    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #718096;">
      If you didn't attempt to sign in, please secure your account by changing your password immediately.
    </p>
  `);

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: params.userEmail,
      to_name:  params.userName,
      subject:  "🔐 Your DriveEasy Sign-In Code",
      html_message: html,
    }, PUBLIC_KEY);
    return true;
  } catch (e) {
    console.warn("EmailJS OTP send failed:", e);
    return false;
  }
}

/* ─────────────────────────────────────
   RENTAL BOOKED
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
  const customerHtml = getHtmlTemplate("Rental Confirmed", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      Hello <strong>${params.userName}</strong>,<br><br>
      Your rental booking has been confirmed! Here are the details of your reservation:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
      <tr><td style="color: #718096; width: 40%;"><strong>Vehicle:</strong></td><td style="color: #1a202c;">${params.vehicleName}</td></tr>
      <tr><td style="color: #718096; border-top: 1px solid #edf2f7;"><strong>From:</strong></td><td style="color: #1a202c; border-top: 1px solid #edf2f7;">${params.startDate}</td></tr>
      <tr><td style="color: #718096; border-top: 1px solid #edf2f7;"><strong>To:</strong></td><td style="color: #1a202c; border-top: 1px solid #edf2f7;">${params.endDate}</td></tr>
      <tr><td style="color: #718096; border-top: 1px solid #edf2f7;"><strong>Total Price:</strong></td><td style="color: #2b6cb0; font-weight: bold; border-top: 1px solid #edf2f7;">${params.totalPrice} FCFA</td></tr>
      <tr><td style="color: #718096; border-top: 1px solid #edf2f7;"><strong>Reference ID:</strong></td><td style="color: #1a202c; font-family: monospace; border-top: 1px solid #edf2f7;">${params.rentalId.slice(0, 8).toUpperCase()}</td></tr>
    </table>
    <p style="margin: 0; font-size: 15px; color: #4a5568;">Our team in Buea will contact you shortly to arrange pickup. Thank you for choosing DriveEasy!</p>
  `);

  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `✅ Rental Confirmed — ${params.vehicleName}`,
    html_message: customerHtml,
  });

  const adminHtml = getHtmlTemplate("New Rental Received", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      A new rental booking has just been made.
    </p>
    <ul style="color: #4a5568; line-height: 1.8;">
      <li><strong>Customer:</strong> ${params.userName} (${params.userEmail})</li>
      <li><strong>Vehicle:</strong> ${params.vehicleName}</li>
      <li><strong>Dates:</strong> ${params.startDate} → ${params.endDate}</li>
      <li><strong>Total:</strong> ${params.totalPrice} FCFA</li>
      <li><strong>Ref ID:</strong> ${params.rentalId.slice(0, 8).toUpperCase()}</li>
    </ul>
    <p style="margin: 20px 0 0 0; font-size: 15px; color: #4a5568;">Please log in to the Admin Dashboard to manage this booking.</p>
  `);

  await send({
    to_email: ADMIN_EMAIL,
    to_name:  "DriveEasy Admin",
    subject:  `🆕 New Rental — ${params.vehicleName}`,
    html_message: adminHtml,
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
  const customerHtml = getHtmlTemplate("Purchase Confirmed", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      Hello <strong>${params.userName}</strong>,<br><br>
      Congratulations! Your vehicle purchase is confirmed.
    </p>
    <div style="background-color: #f0fff4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
      <h3 style="margin: 0 0 10px 0; color: #2f855a; font-size: 20px;">${params.vehicleName}</h3>
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #22543d;">${params.salePrice} FCFA</p>
    </div>
    <p style="margin: 0 0 10px 0; color: #4a5568;"><strong>Reference ID:</strong> <span style="font-family: monospace;">${params.saleId.slice(0, 8).toUpperCase()}</span></p>
    <p style="margin: 0; font-size: 15px; color: #4a5568;">Our team will contact you shortly to arrange the vehicle handover in Buea.</p>
  `);

  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `🎉 Purchase Confirmed — ${params.vehicleName}`,
    html_message: customerHtml,
  });

  const adminHtml = getHtmlTemplate("New Vehicle Sale", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      A new vehicle sale has been recorded!
    </p>
    <ul style="color: #4a5568; line-height: 1.8;">
      <li><strong>Customer:</strong> ${params.userName} (${params.userEmail})</li>
      <li><strong>Vehicle:</strong> ${params.vehicleName}</li>
      <li><strong>Price:</strong> ${params.salePrice} FCFA</li>
      <li><strong>Ref ID:</strong> ${params.saleId.slice(0, 8).toUpperCase()}</li>
    </ul>
    <p style="margin: 20px 0 0 0; font-size: 15px; color: #4a5568;">Please arrange the handover with the customer.</p>
  `);

  await send({
    to_email: ADMIN_EMAIL,
    to_name:  "DriveEasy Admin",
    subject:  `💰 New Sale — ${params.vehicleName}`,
    html_message: adminHtml,
  });
}

/* ─────────────────────────────────────
   RENTAL STATUS CHANGED
───────────────────────────────────── */
export async function emailRentalStatusChanged(params: {
  userEmail: string;
  userName: string;
  vehicleName: string;
  newStatus: string;
  rentalId: string;
}) {
  const messages: Record<string, string> = {
    initiated: "Your rental has been <strong>INITIATED</strong> and is awaiting review.",
    pending:   "Your rental is currently <strong>PENDING</strong> approval.",
    active:    "Your rental is now <strong>ACTIVE</strong>. The vehicle is ready for you.",
    completed: "Your rental has been marked <strong>COMPLETED</strong>. Thank you for using DriveEasy!",
    cancelled: "Your rental has been <strong>CANCELLED</strong>. Contact us if this was unexpected.",
  };

  const statusColor = params.newStatus === 'active' ? '#2b6cb0' : params.newStatus === 'completed' ? '#2f855a' : params.newStatus === 'cancelled' ? '#c53030' : '#d69e2e';

  const html = getHtmlTemplate("Rental Update", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      Hello <strong>${params.userName}</strong>,<br><br>
      The status of your rental has been updated.
    </p>
    <div style="border-left: 4px solid ${statusColor}; background-color: #f8fafc; padding: 15px 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 5px 0; color: #1a202c;"><strong>Vehicle:</strong> ${params.vehicleName}</p>
      <p style="margin: 0 0 5px 0; color: #1a202c;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${params.newStatus.toUpperCase()}</span></p>
      <p style="margin: 0; color: #718096; font-family: monospace;">Ref: ${params.rentalId.slice(0, 8).toUpperCase()}</p>
    </div>
    <p style="margin: 0; font-size: 15px; color: #4a5568;">${messages[params.newStatus] || ""}</p>
  `);

  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `📋 Rental Update — ${params.vehicleName}`,
    html_message: html,
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
  const customerHtml = getHtmlTemplate("Rental Cancelled", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      Hello <strong>${params.userName}</strong>,<br><br>
      Your rental has been cancelled successfully as requested.
    </p>
    <div style="background-color: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 15px 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 5px 0; color: #c53030;"><strong>Vehicle:</strong> ${params.vehicleName}</p>
      <p style="margin: 0; color: #c53030; font-family: monospace;">Ref: ${params.rentalId.slice(0, 8).toUpperCase()}</p>
    </div>
    <p style="margin: 0; font-size: 15px; color: #4a5568;">If you need to make a new booking, visit our website.</p>
  `);

  await send({
    to_email: params.userEmail,
    to_name:  params.userName,
    subject:  `❌ Rental Cancelled — ${params.vehicleName}`,
    html_message: customerHtml,
  });

  const adminHtml = getHtmlTemplate("Rental Cancelled by User", `
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
      A customer has cancelled their rental.
    </p>
    <ul style="color: #4a5568; line-height: 1.8;">
      <li><strong>Customer:</strong> ${params.userName} (${params.userEmail})</li>
      <li><strong>Vehicle:</strong> ${params.vehicleName}</li>
      <li><strong>Ref ID:</strong> ${params.rentalId.slice(0, 8).toUpperCase()}</li>
    </ul>
  `);

  await send({
    to_email: ADMIN_EMAIL,
    to_name:  "DriveEasy Admin",
    subject:  `❌ Rental Cancelled by ${params.userName}`,
    html_message: adminHtml,
  });
}
