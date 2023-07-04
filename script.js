
// Variables
let user;
let userId;


// Code ran on page load
let authCode = new URLSearchParams(window.location.search).get('code');
let accessToken;
let allMedia = {};


onPageLoad();


async function onPageLoad() {
    console.log(`Code: ${authCode}`)

    if (authCode) {
        accessToken = await getAccessToken();
        console.log(accessToken)

        await getMedia()
        console.log(allMedia)
        console.log(Object.keys(allMedia.data).length)
    }

}






// Functions


function redirect() {
    console.log("Redirected to auth")
    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${user}&redirect_uri=https://localhost:5173/&scope=user_profile,user_media&response_type=code`;
}


async function getAccessToken() {
    const form = new FormData();
    form.append('client_id', user);
    form.append('client_secret', userId);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', 'https://localhost:5173/');
    form.append('code', authCode);

    let result = await fetch('http://localhost:8080/https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        body: form
    }).then((result) => result.json());

    // Set user id in media dict
    allMedia["user"] = result.user_id;

    return result.access_token;

}

async function getMedia() {

    let endpoint;

    // Continue off previous fetched media, otherwise fetch from beginning
    if (localStorage.getItem("allMedia")) {
        allMedia = JSON.parse(localStorage.getItem("allMedia"));
        endpoint = allMedia.endpoint;
    } else {
        endpoint = `http://localhost:8080/https://graph.instagram.com/me/media?access_token=${accessToken}`;
        allMedia["data"] = {}
    }


    console.log("HI")
    console.log(allMedia)
    
    // Loop while the endpoint is not null (has a 'next' redirect)
    while (endpoint) {
        console.log(`Current endpoint: ${endpoint}`)
        let result;

        // Fetch media IDs, 25 posts per fetch
        result = await fetch(endpoint)
            .then((result) => result.json());

        // Exit fetching if rate limit is hit
        if (result.error) {
            handleMediaError(endpoint);
            return;
        }

        
        console.log(result)

        // Fetch media information for each ID
        for (let media of result.data) {

            let mediaResult = await fetch(`http://localhost:8080/https://graph.instagram.com/${media.id}?access_token=${accessToken}&fields=id,media_type,media_url,username,timestamp,caption,permalink,children`)
                .then((result) => result.json());

            if (mediaResult.error) {
                handleMediaError(endpoint)
                return;
            }
            
            // Add media info by ID in allMedia's data key
            let temp = {};
            temp[media.id] = mediaResult;
            Object.assign(allMedia["data"], temp);

        }

        // Advance to next page
        endpoint = result.paging.next;
        console.log(`Advanced endpoint: ${endpoint}`)
        
    }


    // Once fully complete, save allMedia to local storage
    allMedia["endpoint"] = null;
    localStorage.setItem("allMedia", JSON.stringify(allMedia));

}


function saveMediaJSON() {
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(allMedia, null, "\t")], { type: 'application/json' });
    a.href = URL.createObjectURL(file);
    a.download = 'instagram-media.json';
    a.click();
}


async function loadMediaJSON() {
    let file = document.getElementById('getFile').files[0]
    let text = await file.text()

    allMedia = JSON.parse(text);

    console.log(allMedia)
    console.log(Object.keys(allMedia["data"]).length)
}

function handleMediaError(endpoint) {
    console.log(`Only ${Object.keys(allMedia["data"]).length} posts were retrieved, please press "Get Instagram data" in an hour to continue retrieving all posts.`);

    // Save allMedia to local storage w/ failed endpoint
    allMedia["endpoint"] = endpoint;
    localStorage.setItem("allMedia", JSON.stringify(allMedia));
}