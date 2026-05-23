import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const transId = searchParams.get("transId");

    if (!transId) {
      return NextResponse.json(
        { error: "Transaction ID (transId) is required." },
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
    const response = await fetch(`${baseUrl}/payment-status/${transId}`, {
      method: "GET",
      headers: {
        apiuser: apiUser,
        apikey: apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to retrieve payment status" },
        { status: response.status }
      );
    }

    // Success response contains standard Fapshi transaction fields: { status, amount, payerName, etc. }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fapshi status error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
