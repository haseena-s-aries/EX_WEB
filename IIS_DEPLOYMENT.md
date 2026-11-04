# Frontend IIS deployment

Run `npm run build`. Deploy the contents of `web-build`, or extract the supplied frontend ZIP into a dedicated site folder such as `C:\inetpub\wwwroot\ExSurveyWeb`.

In IIS Manager, create a separate website pointing to that folder. Choose an unused binding and configure HTTPS with a trusted certificate. Enable the IIS Static Content and Default Document features. Give the site's application-pool identity Read & Execute permission on the folder. The included web.config sets index.html as the default page, so Browse opens the application directly. Node.js and the ASP.NET Core Hosting Bundle are not required for this static frontend.

The browser loads `config.js` before the application and chooses the API automatically:

| Frontend address | API |
| --- | --- |
| localhost or loopback on port 440 (IIS) | https://localhost:338/api |
| localhost or loopback on other ports, including npm run web on 3000 | https://localhost:7288/api | 
| Server IP or live DNS hostname | https://139.5.189.155:441/api |

For local development start the API with `dotnet run --project Ex-SurveyApp_api --launch-profile https` from the backend repository, and run `npm run web` from the frontend repository. Localhost requires an API running on that same computer. For IIS localhost access the API needs its existing wildcard port 441 binding. Edit this public file to change the API addresses without rebuilding; include `/api`. Never add secrets to it. Keep all generated bundle and asset files together.

For this deployment the frontend uses HTTPS port 440. In the API server's appsettings.Production.json, set Cors:AllowedOrigins to these exact frontend origins, without a trailing slash or path:

```json
"Cors": {
  "AllowedOrigins": [
    "https://localhost:440",
    "https://139.5.189.155:440",
    "https://127.0.0.1:440"
  ]
}
```

The existing server site invoice_sheet already uses HTTPS port 440. Confirm that this is the intended frontend site before changing it; do not create another conflicting binding. In that frontend site's HTTPS binding, use All Unassigned, port 440, a blank hostname, SNI unchecked and the appropriate certificate to accept localhost as well as IP requests. Keep its physical path pointed at the folder containing index.html. Restart the API site after updating its configuration. Keep the API AllowedHosts setting as `139.5.189.155;localhost;127.0.0.1` for IP access. Localhost works only in a browser running on the IIS server; other computers must use the server IP or a DNS hostname.

Both frontend and API HTTPS certificates must be trusted by client browsers and valid for their hostnames/IPs. The previously shown API certificate warning must be resolved for reliable browser API calls. Prefer a DNS hostname with a trusted certificate when available; update config.js accordingly.

Open the frontend site root, confirm the login page loads, and inspect the browser Network panel to confirm API calls use the configured server rather than localhost. API errors, certificate errors, and CORS errors must be resolved on the corresponding server configuration.
