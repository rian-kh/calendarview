
// Variables
let user;



// Code ran on page load
let authCode = new URLSearchParams(window.location.search).get('code');
let accessToken;

console.log(`Code: ${authCode}`)






// Functions


function redirect() {
    console.log("Redirected to auth")
    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${user}&redirect_uri=https://localhost:5173/&scope=user_profile,user_media&response_type=code`;
}

