export const getAuth0ManagementToken = async () => {
  try {
    const response = await fetch(
      'https://cfw-stream.us.auth0.com/oauth/token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: 'hPcABsYmul3ZFIerFoS7G3UlrAbIu06S',
          client_secret:
            'Y_Gq_uRgXFtwWA-MKHRXpIuqxpRSk7WMMYryiDT05cc8pGMrWJufytZ0XigzYVnZ',
          audience: 'https://cfw-stream.us.auth0.com/api/v2/',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!response.ok) return null;

    const data: { access_token: string } = await response.json();

    return data.access_token;
  } catch (err) {
    return null;
  }
};

export const updateUserRoles = async (access_token: string) => {
  try {
    const response = await fetch(
      'https://cfw-stream.us.auth0.com/api/v2/users/auth0|646775d892e83c2d192ee035/roles',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          roles: ['rol_QIn4adoGrmEmJdJN'],
        }),
      }
    );

    console.log(response.status);

    const data = await response.json();
    console.log({ data });
    return data;
  } catch (err) {}
};
