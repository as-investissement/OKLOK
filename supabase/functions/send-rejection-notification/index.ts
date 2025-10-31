import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

const FIREBASE_SERVICE_ACCOUNT: FirebaseServiceAccount = {
  type: "service_account",
  project_id: "feuilles-de-temps-b6524",
  private_key_id: "a46c2fbf76a7220bc74e284004d887d41978e653",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCRoPX24H8/Zu8K\n/WHmlYKIyZlC4y8jxrdANs4r+FS54nnSsy4UjWYtnP+z/NDX1iaX9YAuiyrQ9uFb\nFfhTZ/rJ199zOwQ+SBKQ1Ap4hhtA4sGPlPTD2a5DslhBPt7vNcx4+2Bmx83O/bxx\n9wfTOwvD3AvPMbUvZRUTjgkuh3thAuMdNRvWZ7aFVwAVjO5NJLsJHiOFLocrVm3y\ntvD/KlBFqhm5v3MwC5bhBWji9Kgu7vCtRL5kOe2eHtG+VjVbyA4KgXf70hAAX1Zz\nAgN9D+cR1GLXADcK44cDdV5fRHhhE1Z3Fjxm3sJdKBQ/sigIYrgpqZmNO6q3kic5\nW7audbuRAgMBAAECggEADY7EAg05y4KfE+bYYR803THnktKTu5ZEeTX2USGiwat+\nq/RX1edUG+sB4z/Q3Ec+UJIKh6AX3Fx089tCbdbAV7Tr7fkQlrvJqVy+8iQ0uqsM\nWicD9+J21taZC3n5nKDlkwh+xmgo65xebuhl/MRX1A7TCqHAvH4sotAWYBPnk0sN\nhkymlJqQOKE7UyRXqGuWuMYQ0d72ceoJA/SOi7jsSUs6krzK4lv7tATrbGEqftR+\nXL+8dVdV88Zrrq0FWGzMtByJ1uk5f+mRIdQ48RahrPD/QM0sLlr/hQ+3U4xSDPmN\nUpmQFI5IT3W8gR973bfJMPXBSQfsCLR1PWXp5CA6AQKBgQDKkasjfZTiXqqpRubP\nXUSKmwwBESt8YAesV+FUNTSkAG1hQV5L6qfNHHFw83K7r9XNp5VbidaOls9GzmG8\nWxlCGomTayvP9Tu/HLRTgmpFnHQAwIyRxSas/0wjr2VLdYK6v3JwRwZ3ROTdlEgD\n8JBW3J0812G2r5l3XhMuFBQIFwKBgQC4CnDQdlBjdShedLRv2ybwPzZubYgQWg6F\nfkr9ctI0O78+X63I34Ha/6D4jWmw+N/3yACtmuZ6T4TTANIQ8Sb5GhkZAfmzk4OM\nHiJ+hoZo6r8zPjXJQ6Vxu+nUD363fsU2D4TNxQ95SZNFX/JSwYPEvPsJhDv6fo1c\nT2cb38Z6lwKBgGPWH27CehqHZb1AQIl7Akj92ZC9EZ2fBqkeNuP1xRf/Telc+kiY\nQlOI7TAqDCYMp2dQbQBMkv57vXS8Stc2XuCBi8SoUVORHf02/HkcEZx1W4bzX1SI\nwmMJAFGmJFpodCHuMUy89KbbwaCjcErgyYLGAIj37iTHru9x4ioXozfJAoGAKKEF\nbr/v10UR+GhDPT5gRkFuPsqncxSuiAHthC5JAYb/HUH6F5JgFHzCiJyPbKZEq2rX\n23uKzg2oAPz5YwwZ0nxUdhTdjytNqy0r6ErCeX75XtKpBRmN+KHHaS1SiCfQWbLr\nWpHabKg1fudDk8ls0Y32zY8HvrEZe/t7g8fPBVkCgYAJIqeb6F50UZniWw+BJXxm\nkMb8vt5qI92Z2sVZrbv6YqJV8ayNfLU5JNNLDr1mLFWbteaWrAVzEZEbXyuMjW1v\n3qyGdZgGEjVWa01Auabd2g+gFI36TA+46DM7Mp0bDz1oRpFwJxE/gEtn/P9u5fhG\n7/ZkyrtS2YHulXFNvBQrxg==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@feuilles-de-temps-b6524.iam.gserviceaccount.com",
  client_id: "111732827571250168208",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40feuilles-de-temps-b6524.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

async function getAccessToken(): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));

  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: FIREBASE_SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet));
  const signatureInput = jwtHeader + "." + jwtClaimSetEncoded;

  const privateKeyPem = FIREBASE_SERVICE_ACCOUNT.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");

  const binaryDer = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = signatureInput + "." + signatureBase64;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error("Failed to get access token: " + error);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendNotification(
  accessToken: string,
  token: string,
  title: string,
  body: string,
  deepLink: string
): Promise<void> {
  const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${FIREBASE_SERVICE_ACCOUNT.project_id}/messages:send`;

  const message = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        deeplink: deepLink,
        route: "/messages",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          click_action: deepLink,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    },
  };

  const response = await fetch(fcmEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send notification: ${error}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const tokensResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_tokens?user_id=eq.${userId}&enabled=eq.true&revoked=eq.false&select=token`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!tokensResponse.ok) {
      const errorText = await tokensResponse.text();
      throw new Error(`Failed to fetch push tokens: ${errorText}`);
    }

    const tokens = await tokensResponse.json();

    if (!tokens || tokens.length === 0) {
      console.log("No active push tokens found for user");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens found for user"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const title = "Nouveau message";
    const body = "Vous avez un nouveau message";
    const deepLink = "feuillestemps://messages";

    const accessToken = await getAccessToken();

    const results = await Promise.allSettled(
      tokens.map(async (tokenData: any) => {
        try {
          await sendNotification(
            accessToken,
            tokenData.token,
            title,
            body,
            deepLink
          );

          await fetch(`${supabaseUrl}/rest/v1/push_notifications_log`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              user_id: userId,
              token: tokenData.token,
              title: title,
              body: body,
              status: "sent",
              data: { deepLink }
            }),
          });

          return { success: true, token: tokenData.token };
        } catch (error: any) {
          console.error(`Failed to send to token ${tokenData.token}:`, error);

          await fetch(`${supabaseUrl}/rest/v1/push_notifications_log`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              user_id: userId,
              token: tokenData.token,
              title: title,
              body: body,
              status: "failed",
              error_message: error.message,
              data: { deepLink }
            }),
          });

          return { success: false, token: tokenData.token, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Rejection notification sent successfully",
        totalTokens: tokens.length,
        successCount: successCount,
        failedCount: tokens.length - successCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending rejection notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});