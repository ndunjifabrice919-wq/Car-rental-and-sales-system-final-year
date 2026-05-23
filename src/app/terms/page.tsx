export default function TermsPage() {
  return (
    <div className="page" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="section-title">Terms of Service</h1>
        <p className="section-subtitle">Last updated: May 2025 · DriveEasy, Buea, Cameroon</p>
      </div>

      {[
        { title: "1. Acceptance of Terms", content: "By accessing or using DriveEasy (\"the Platform\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. DriveEasy reserves the right to update these terms at any time with notice to registered users." },
        { title: "2. Eligibility", content: "You must be at least 21 years of age and hold a valid driver's licence to rent a vehicle. All users must complete identity verification (KYC) before completing any rental or purchase transaction. Providing false identification is a criminal offence and will result in immediate account termination and reporting to authorities." },
        { title: "3. Vehicle Rentals", content: "Rental bookings are confirmed only after successful payment. The renter is responsible for any damage, traffic violations, fuel, and tolls incurred during the rental period. Vehicles must be returned in the same condition and at the agreed date and time. Late returns are subject to additional daily rate charges." },
        { title: "4. Vehicle Purchases", content: "All vehicle sale listings are subject to availability. Prices displayed include applicable fees and are payable in full via the platform. DriveEasy acts as an intermediary and does not take ownership of listed vehicles. Buyers are encouraged to inspect vehicles before completing payment." },
        { title: "5. Payments & Refunds", content: "Payments are processed securely via MTN Mobile Money, Orange Money, or supported card providers. Refunds for cancelled bookings are subject to our cancellation policy: cancellations made 48+ hours before the rental start date receive a full refund; cancellations within 48 hours forfeit 50% of the rental fee." },
        { title: "6. Identity Verification (KYC)", content: "A one-time security code (OTP) is sent to your registered email before every payment to verify your identity. You are required to upload a valid government-issued ID (National ID Card, Passport, or Driver's Licence). Failure to complete verification will restrict access to booking features." },
        { title: "7. User Conduct", content: "Users may not use the Platform for any unlawful purpose, including fraud, money laundering, or misrepresentation. Any attempt to circumvent security measures, including identity verification, will result in immediate account suspension and legal action." },
        { title: "8. Liability Limitation", content: "DriveEasy is not liable for accidents, injuries, theft, or losses occurring during a rental. The renter assumes full responsibility for the vehicle during the rental period. We strongly recommend obtaining personal motor insurance for the rental duration." },
        { title: "9. Privacy", content: "Your personal data is collected and processed in accordance with our Privacy Policy. We do not sell your personal information to third parties. Identity documents are stored securely and used solely for verification purposes." },
        { title: "10. Contact & Disputes", content: "For disputes or questions regarding these terms, contact us at support@driveeasy.cm or visit our Contact page. Disputes shall be resolved under the laws of the Republic of Cameroon." },
      ].map(section => (
        <div key={section.title} style={{ marginBottom: "28px", borderBottom: "1px solid var(--navy-border)", paddingBottom: "24px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 10px", color: "var(--white-soft)" }}>{section.title}</h2>
          <p style={{ color: "var(--white-muted)", fontSize: "0.88rem", lineHeight: 1.8, margin: 0 }}>{section.content}</p>
        </div>
      ))}

      <p style={{ color: "var(--white-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "12px" }}>
        By using DriveEasy you confirm you have read, understood and agree to these Terms of Service.
      </p>
    </div>
  );
}
