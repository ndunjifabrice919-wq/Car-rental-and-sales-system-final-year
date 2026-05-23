import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { amount, email, userId, externalId, message } = await request.json();

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: "Amount must be at least 100 XAF" },
        { status: 400 }
      );
    }

    const apiUser = process.env.FAPSHI_API_USER;
    const apiKey = process.env.FAPSHI_API_KEY;
    const env = process.env.FAPSHI_ENV || "sandbox";

    if (!apiUser || !apiKey) {
      return NextResponse.json(
        { error: "Fapshi credentials are not configured on the server." },
        { status: 500 }
      );
    }

    const baseUrl = env === "live" ? "https://live.fapshi.com" : "https://sandbox.fapshi.com";

    // Call Fapshi API
    const response = await fetch(`${baseUrl}/initiate-pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiuser: apiUser,
        apikey: apiKey,
      },
      body: JSON.stringify({
        amount: Math.round(amount), // Fapshi requires integer XAF
        email: email || undefined,
        userId: userId || undefined,
        externalId: externalId || undefined,
        message: message || "DriveEasy Payment",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to initiate payment with Fapshi" },
        { status: response.status }
      );
    }

    // Success response contains: { message, link, transId, dateInitiated }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fapshi initiate error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
