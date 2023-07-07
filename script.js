
// Variables
let user;
let userId;


// Code ran on page load
let authCode = new URLSearchParams(window.location.search).get('code');
let accessToken;
let allMedia = {};


// Redirects to original site if reloaded, adapted from https://stackoverflow.com/a/53307588/21809626
const pageAccessedByReload = (
    (window.performance.navigation && window.performance.navigation.type === 1) ||
    window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload')
);

if (pageAccessedByReload)
    document.location = "https://localhost:5173"



window.onload = onPageLoad;

async function onPageLoad() {
    console.log(`Code: ${authCode}`)

    // Fetch data if redirected back from auth
    if (authCode) {
        accessToken = await getAccessToken();
        console.log(accessToken)

        await getMedia()

    }

    // Load data if stored media data is complete (endpoint is null)
    else if (localStorage.getItem("allMedia")) {
        if (!(JSON.parse(localStorage.getItem("allMedia"))["endpoint"])) {
            allMedia = JSON.parse(localStorage.getItem("allMedia"));
        }
    }

    // Update UI if allMedia is populated
    if (Object.keys(allMedia).length > 0)
        updateUI()





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

        // Only append accessToken if an endpoint was given (incomplete fetch)
        if (allMedia.endpoint)
            endpoint = allMedia.endpoint + accessToken;

    } else {
        endpoint = `http://localhost:8080/https://graph.instagram.com/me/media?access_token=${accessToken}`;
        allMedia["data"] = {}
    }


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
            let date = new Date(mediaResult.timestamp);
            let month = date.toLocaleString("en-us", { month: "long" })
            let monthDay = date.toLocaleString("en-us", { month: "long", day: "2-digit" })

            if (!(allMedia["data"][month]))
                allMedia["data"][month] = {};

            if (!(allMedia["data"][month][monthDay]))
                allMedia["data"][month][monthDay] = {};

            allMedia["data"][month][monthDay][media.id] = mediaResult;

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

    if (allMedia["endpoint"])
        console.log("This loaded JSON is incomplete and does not have all your posts!\nTo get all your posts, press Get instagram data.")


    updateUI(true);
}

function handleMediaError(endpoint) {
    console.log(`Only ${getLength()} posts were retrieved in total.\nPlease refresh and press "Get instagram data" in an hour to continue retrieving all posts.`);

    // Save allMedia to local storage w/ failed endpoint
    allMedia["endpoint"] = endpoint.replace(/(?<=\?access_token=).*/, "");
    localStorage.setItem("allMedia", JSON.stringify(allMedia));
}

function getLength() {

    let total = 0;

    for (let month of Object.keys(allMedia["data"])) {
        for (let day of Object.keys(allMedia["data"][month])) {
            for (let post of Object.keys(allMedia["data"][month][day])) {
                total++;
            }
        }
    }

    return total;
}

function updateUI(fromJSON = false) {


    console.log()

    document.getElementById("calendars").innerHTML = "Hi";
    document.getElementById("calendars").style.display = "inline"

    // Only load logout/save buttons if not accessed from JSON
    if (!(fromJSON)) {
        document.getElementById("saveFile").style.display = "inline"
        document.getElementById("logout").style.display = "inline"
        document.getElementById("login").style.display = "none"
    } else {
        document.getElementById("login").style.display = "inline"
        document.getElementById("saveFile").style.display = "none"
        document.getElementById("logout").style.display = "none"
    }


    // Create calendars


    // Use leap year to get all possible days
    let date = new Date("01/01/2024");

    // Tables should be 4 rows by 3 cols, increase month by 1 each time
    let monthNum = 1;

    for (let row = 0; row < 4; row++) {
        let rowDiv = document.createElement('div');
        rowDiv.setAttribute("class", "row");
        


        for (let col = 0; col < 3; col++) {

            date = new Date(date.getFullYear(), monthNum, 0);
            let month = date.toLocaleString("en-us",{month:"long"});
            monthNum++;

            let table = document.createElement('table');
            
            let currentDay = 1;

            // Month header
            let header = document.createElement('tr');
            header.innerHTML = `<td colspan="7"><p>${month}</p></td>`
            table.appendChild(header)

            for (let tableRow = 0; tableRow < 5; tableRow++) {


                let tableRowElement = document.createElement('tr')

                for (let tableCol = 0; tableCol < 7; tableCol++) {
                    let cell = document.createElement('td');
                    let cellData = document.createElement('p');
                    let key;
                    
                    // Pad day num with 0 to match allMedia keys
                    if (currentDay < 10)
                        key = `${month} 0${currentDay}`
                    else
                        key = `${month} ${currentDay}`
                    
                    // Only add day-related info if the day is <= the max days in the month
                    if (currentDay <= date.getDate()) {
                        cellData.setAttribute("id", key)
                        cellData.textContent = currentDay;

                        // Make text green if that day is present in allMedia

                        if (allMedia["data"][month][key])
                            cellData.style.color = "lime";


                    }

                    cell.appendChild(cellData);

                    currentDay++;

                    tableRowElement.appendChild(cell);
                }

                table.appendChild(tableRowElement);
                
                
            }


            rowDiv.appendChild(table);
            



        }

        
        document.getElementById("calendars").appendChild(rowDiv);

    }


    // date.toLocaleString("en-us", {month:"long"});

    console.log(document.getElementById("calendars"))

    console.log(allMedia)



}

function logout() {

    if (confirm("NOTE: Logging out will clear the retrieved Instagram data!\nAre you sure you want to log out?")) {
        localStorage.clear();
        window.location.href = "https://localhost:5173";
    }
}