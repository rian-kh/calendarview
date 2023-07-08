
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

    document.getElementById("calendars").innerHTML = "<h3>Your calendar (Lighter = More posts):</h3>";
    document.getElementById("hidden").style.display = "inline"
    document.getElementById("postSide").style.display = "none"

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


    // Get max posts in a single day, for determining date colour
    let maxPosts = 0;
    
    for (let month of Object.keys(allMedia["data"])) {
        for (let day of Object.keys(allMedia["data"][month])) {
            let posts = Object.keys(allMedia["data"][month][day]).length

            if (posts > maxPosts)
                maxPosts = posts;

        }
    }

    let maxPostSegment = maxPosts / 4;
    let colorThreshold = {"low":1, "medium":Math.floor(maxPostSegment * 2), "high":Math.floor(maxPostSegment * 3), "max":maxPosts}
    


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
            let month = date.toLocaleString("en-us", { month: "long" });
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
                    let cellData = document.createElement('a');
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

                        if (allMedia["data"][month]) {
                            if (allMedia["data"][month][key]) {
                                
                                // Change date color based on # of posts on date
                                let posts = Object.keys(allMedia["data"][month][key]).length;

                                if (posts >= colorThreshold.low && posts < colorThreshold.medium)
                                    cellData.style.color = "#048a04";
                                else if (posts >= colorThreshold.medium && posts < colorThreshold.high)
                                    cellData.style.color = "#04cf04";
                                else if (posts >= colorThreshold.high && posts < colorThreshold.max)
                                    cellData.style.color = "#22ff00";
                                else if (posts == colorThreshold.max)
                                    cellData.style.color = "#00ffa2";

                                cellData.setAttribute("href", "javascript:;")
                                cellData.setAttribute("onClick", `displayPost("${month}", "${key}")`)
                            }
                        }


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

    console.log(document.getElementById("calendars"))

    console.log(allMedia)

}


function displayPost(month, key) {
    
    console.log(allMedia);

    document.getElementById("postSide").style.display = "inline"

    document.getElementById("dateText").textContent = `On ${key},`;

    if (Object.keys(allMedia["data"][month][key]).length == 1)
        document.getElementById("dateText").textContent +=  ` 1 post:`;
    else
        document.getElementById("dateText").textContent += ` ${Object.keys(allMedia["data"][month][key]).length} posts:`

    let postDisplay = document.getElementById("postDisplay");

    

    postDisplay.innerHTML = "";

    // Display posts from oldest to newest (by year, maybe change to by actual date?)
    for (let id of Object.keys(allMedia["data"][month][key]).sort((a, b) => new Date(allMedia["data"][month][key][a].timestamp).getFullYear() - new Date(allMedia["data"][month][key][b].timestamp).getFullYear())) {

        
        let post = allMedia["data"][month][key][id]
        console.log(post.timestamp)
        let link = post.permalink;
        let year = new Date(post.timestamp).getFullYear();
        
        postDisplay.innerHTML += `<div class="post"><h3>${year}</h3><blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${link}" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="${link}" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this post on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="${link}" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank"></a></p></div></blockquote></div>`
    }

    window.instgrm.Embeds.process()
    
    
    console.log(postDisplay)
}

function logout() {

    if (confirm("NOTE: Logging out will clear the retrieved Instagram data!\nAre you sure you want to log out?")) {
        localStorage.clear();
        window.location.href = "https://localhost:5173";
    }
}