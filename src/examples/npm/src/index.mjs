// src/index.mjs

import { PenpotClient } from "@ajsb85/penpot-api-client";

async function fetchCurrentUserProfile() {
  const client = new PenpotClient({
    baseUrl: "https://design.penpot.app/api/rpc",
    accessToken: "your_personal_access_token_here",
    debug: false,
  });

  try {
    const { data: userProfile, error: profileError } = await client.auth.getProfile().exec();

    if (userProfile) {
      console.log("Successfully fetched user profile:");
      console.log(`- ID: ${userProfile.id}`);
      console.log(`- Full Name: ${userProfile.fullname}`);
      console.log(`- Email: ${userProfile.email}`);
    } else if (profileError) {
      console.error("Failed to fetch user profile:");
      console.error(`- Message: ${profileError.message}`);
      console.error(`- Type: ${profileError.name}`);
      if (profileError.cause) {
        console.error(`- Cause:`, profileError.cause);
      }
    }
  } catch (error) {
    console.error("An unhandled exception occurred:", error);
  }
}

fetchCurrentUserProfile();
