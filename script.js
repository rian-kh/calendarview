
// Variables
let user;
let userId;


// Code ran on page load
let authCode = new URLSearchParams(window.location.search).get('code');
let accessToken;

onPageLoad();

console.log(`Code: ${authCode}`)

async function onPageLoad() {
    console.log(`Code: ${authCode}`)

    if (authCode) {
        accessToken = await getAccessToken();
        console.log(accessToken)

        await getMedia()
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

    return result.access_token;

}

async function getMedia() {
    let result = await fetch(`http://localhost:8080/https://graph.instagram.com/me/media?access_token=${accessToken}`)
                       .then((result) => result.json()).then((result) => result.data);

    
    
    for (let media of result) {

        let mediaResult = await fetch(`http://localhost:8080/https://graph.instagram.com/${media.id}?access_token=${accessToken}&fields=id,media_type,media_url,username,timestamp,caption,permalink,children`)
                           .then((result) => result.json());

        console.log(mediaResult)
    }



}