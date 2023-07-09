# calendarview
Uses your Instagram data to show you the posts you've made across the years, day by day.

![calendarview](https://github.com/rian-kh/calendarview/assets/128095876/7657d8a4-6ec6-4e1e-a8ac-4630b819b9ee)


# Hosting locally
1.  [Install node.js.](https://nodejs.org/en)
2. Clone/download this repository.
3. [Create an Instagram Basic Display app (Step 1-3)](https://developers.facebook.com/docs/instagram-basic-display-api/getting-started), using *"https://<span>localhost:5173/"* as the redirect URIs.

4. In script.js: fill in *clientid* and *secret*'s quotes with the app ID and app secret of the Instagram Basic Display app.
5. In a terminal inside the root directory, run: **npm install**
6. To use the site, run: **bash runServer<span>.sh** and visit **https://localhost:5173**

# FAQ

### Why can't this site be used from Github Pages?
The Instagram Basic Display API only lets you select specific users to be authorized when the app is not verified by Instagram. This site also needs the **cors-anywhere** proxy to make requests, which can't be hosted on Github Pages.

### Why can't I load all my posts at once?
Unverified Instagram Basic Display apps have a limit of 200 requests an hour, meaning that if you have more than 200 posts it will be rate limited and stop abruptly. You will have to refresh and press *"Continue loading Instagram data"* in about an hour to continue off from where the loading stopped.

If you want to load another account but still keep the fetched data to view your calendars later, press *"Save instagram data JSON"* after the loading is fully complete.

### Why doesn't this work with private accounts?
Unfortunately, the Instagram Basic Display API doesn't let you generate access tokens from private accounts. There is also no official API for getting an account's posts without signing in.
