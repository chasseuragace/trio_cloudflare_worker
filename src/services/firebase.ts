export async function createAssetInFirebase(assetPayload: any) {
  // We use the Firestore REST API because the Firebase Admin SDK
  // is often incompatible with the Cloudflare Workers runtime.
  
  const projectId = "eco-firebase-system"; // Hardcoded as per frontend config
  
  // Construct the Firestore REST API URL for the 'assets' collection
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/assets`;

  // Format the payload for the Firestore REST API
  // https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents
  const firestorePayload = {
    fields: {
      title: { stringValue: assetPayload.title },
      description: { stringValue: assetPayload.description },
      images: {
        arrayValue: {
          values: assetPayload.images.map((url: string) => ({ stringValue: url }))
        }
      },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };

  const response = await fetch(firestoreUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Since we don't have a service account token here yet, we will use the API key
      // if authorization is required. If the database rules are open for testing, 
      // this might succeed without it, but usually requires auth.
      // We will append the API key as a query parameter if provided in env.
    },
    body: JSON.stringify(firestorePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Firebase REST API Error:", response.status, errorText);
    throw new Error(`Failed to create asset in Firebase: ${response.status} ${errorText}`);
  }

  return await response.json();
}
